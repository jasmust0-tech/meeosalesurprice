import "dotenv/config";
import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import express from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({
  limit: "1mb",
  // Keep the raw body so Cashfree webhook signatures (HMAC over the exact
  // payload bytes) can be verified.
  verify: (req: any, _res, buf) => {
    if (buf && buf.length) req.rawBody = buf.toString("utf8");
  },
}));

// Wrap a Firestore promise so a broken/unreachable database never hangs a request.
function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); console.warn("Firestore op error:", e?.message || e); resolve(null); });
  });
}

// Optional Firestore database for persistent orders & payments
let db: any = null;

function resolveFirebaseConfig(): any | null {
  let config: any = null;
  if (process.env.FIREBASE_CONFIG) {
    try {
      config = JSON.parse(process.env.FIREBASE_CONFIG.trim());
      return config;
    } catch {}
  }
  if (process.env.FIREBASE_API_KEY || process.env.API_KEY) {
    config = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || "gen-lang-client-0276736297",
      apiKey: process.env.FIREBASE_API_KEY || process.env.API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0276736297"}.firebaseapp.com`,
      firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0276736297"}.firebasestorage.app`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "631450863637",
      appId: process.env.FIREBASE_APP_ID || "1:631450863637:web:7aedfca8dfe14538e0661c"
    };
    return config;
  }
  const localPaths = [
    path.resolve(process.cwd(), "firebase-applet-config.json"),
    path.resolve(__dirname, "firebase-applet-config.json"),
    path.resolve(__dirname, "..", "firebase-applet-config.json"),
  ];
  for (const p of localPaths) {
    if (fs.existsSync(p)) {
      try {
        config = JSON.parse(fs.readFileSync(p, "utf-8"));
        return config;
      } catch {}
    }
  }
  return null;
}

// Connect (or reconnect) Firestore using the currently active settings.
function connectFirestore(cfg: any): any {
  try {
    if (!cfg) return null;
    // Tear down existing app so a config change actually takes effect.
    getApps().forEach((a) => { try { deleteApp(a as any); } catch {} });
    const fbApp = initializeApp(cfg);
    const id = cfg.firestoreDatabaseId || "(default)";
    const firestore = getFirestore(fbApp, id);
    console.log("Firestore connected:", cfg.projectId, "/", id);
    return firestore;
  } catch (err) {
    console.log("Running in standalone in-memory mode for Orders");
    return null;
  }
}

function initDbFromSettings() {
  const stored = settingsStore?.firebase;
  if (stored && stored.apiKey) {
    db = connectFirestore({
      apiKey: stored.apiKey,
      projectId: stored.projectId,
      appId: stored.appId,
      authDomain: stored.authDomain,
      firestoreDatabaseId: stored.firestoreDatabaseId || "(default)",
      storageBucket: stored.storageBucket,
      messagingSenderId: stored.messagingSenderId,
    });
  } else {
    db = connectFirestore(resolveFirebaseConfig());
  }
}

// In-memory product & category store loaded from data/database.json
function loadInitialData() {
  const possiblePaths = [
    path.resolve(process.cwd(), "data", "database.json"),
    path.resolve(__dirname, "data", "database.json"),
    path.resolve(__dirname, "..", "data", "database.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.products) && parsed.products.length > 0) {
          console.log(`Loaded ${parsed.products.length} products and ${parsed.categories?.length || 0} categories from ${p}`);
          return parsed;
        }
      } catch (e) {
        console.warn("Could not read database.json:", e);
      }
    }
  }
  return { categories: [], products: [] };
}

let dbData = loadInitialData();
let cartStore: any[] = [];
let ordersStore: any[] = [];

// ============================================================================
// Orders local file persistence (fallback cache)
// Orders are also stored in Firestore, but a local JSON cache keeps the data
// available across server restarts / cold-starts even if the database is
// temporarily unreachable, so the admin panel never shows empty data.
// ============================================================================
const ORDERS_FILE = path.resolve(process.cwd(), "data", "orders.json");

function loadOrdersFromFile() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
      if (Array.isArray(parsed)) ordersStore = parsed;
      console.log(`Loaded ${ordersStore.length} cached orders from ${ORDERS_FILE}`);
    }
  } catch (e) {
    console.warn("Could not read orders cache:", e);
  }
}

function persistOrdersToFile() {
  try {
    fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersStore, null, 2));
  } catch (e) {
    console.warn("Could not persist orders cache:", e);
  }
}

// ============================================================================
// Live Website Analytics (visitors / page views / traffic)
// ============================================================================
const ONLINE_WINDOW_MS = 45 * 1000; // a visitor is "online" if seen within last 45s
const visitors = new Map<string, number>(); // visitorId -> lastSeen (ms)
let totalVisits = 0;       // unique visitors ever (this process)
let totalPageViews = 0;    // cumulative page views (this process)
let visitsToday = 0;       // unique visitors seen today (this process)
let viewsToday = 0;        // page views today (this process)
let todayKey = new Date().toISOString().slice(0, 10);

function pruneOfflineVisitors(now = Date.now()) {
  for (const [id, last] of visitors) {
    if (now - last > ONLINE_WINDOW_MS) visitors.delete(id);
  }
}

function recordView(visitorId?: string) {
  const now = Date.now();
  const key = new Date().toISOString().slice(0, 10);
  if (key !== todayKey) {
    todayKey = key;
    visitsToday = 0;
    viewsToday = 0;
  }
  totalPageViews++;
  viewsToday++;
  if (visitorId) {
    if (!visitors.has(visitorId)) {
      totalVisits++;
      visitsToday++;
    }
    visitors.set(visitorId, now);
    pruneOfflineVisitors(now);
  }
}

// Track a page view on every storefront navigation (public, no auth).
app.post("/api/track", (req, res) => {
  const visitorId = (req.body && req.body.visitorId) || undefined;
  recordView(visitorId);
  res.json({ ok: true });
});

// An endpoint the client can use to stay "online" (heartbeat) and fetch a count.
app.post("/api/analytics/ping", (req, res) => {
  const visitorId = (req.body && req.body.visitorId) || undefined;
  recordView(visitorId);
  pruneOfflineVisitors();
  res.json({ online: visitors.size, totalPageViews, viewsToday, visitsToday, totalVisits });
});

// Admin live analytics (protected).
app.get("/api/admin/analytics", authMiddleware, (req, res) => {
  pruneOfflineVisitors();
  res.json({
    onlineNow: visitors.size,
    totalVisits,
    totalPageViews,
    visitsToday,
    viewsToday,
    onlineWindowSeconds: ONLINE_WINDOW_MS / 1000,
  });
});

// ============================================================================
// Admin & Dynamic Settings
// ============================================================================

// Cashfree Payment Gateway configuration (credentials + environment).
export interface CashfreeConfig {
  enabled: boolean;
  environment: "sandbox" | "prod";
  clientId: string;
  secretKey: string;
}

// Default admin settings (used when nothing is stored in Firestore yet).
export interface AppSettings {
  admin: { username: string; passwordHash: string; passwordSalt: string };
  siteName: string;
  upi: { address: string; notePrefix: string };
  firebase: {
    apiKey: string;
    projectId: string;
    appId: string;
    authDomain: string;
    firestoreDatabaseId: string;
    storageBucket: string;
    messagingSenderId: string;
  };
  pixels: string[];   // Meta Pixel IDs (can be multiple)
  gaCodes: string[];  // Google Analytics Measurement IDs
  tokenSecret: string; // stable HMAC secret for admin auth (persisted)
  cashfree: CashfreeConfig; // Cashfree payment gateway keys
}

const getEnvFirebase = () => ({
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyA2WI7J7ixf6KeeZmfYjXuiamLzAtf9Q98",
  projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0276736297",
  appId: process.env.FIREBASE_APP_ID || "1:631450863637:web:7aedfca8dfe14538e0661c",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "gen-lang-client-0276736297.firebaseapp.com",
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "gen-lang-client-0276736297.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "631450863637",
});

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function defaultSettings(): AppSettings {
  const defaultPass = process.env.ADMIN_PASSWORD || "admin123";
  const defaultUser = process.env.ADMIN_USERNAME || "admin";
  // Deterministic defaults so auth stays stable across serverless cold-starts
  // even when Firestore / filesystem persistence is unavailable. Change the
  // password in the admin panel (or set env vars) for real persistence/security.
  const salt = process.env.ADMIN_SALT || "meesho-admin-salt-v1-fixed";
  const tokenSecret = process.env.ADMIN_TOKEN_SECRET_OVERRIDE || "meesho-admin-token-secret-v1-9f3b1c7d2e4a6b8c";
  return {
    admin: { username: defaultUser, passwordHash: hashPassword(defaultPass, salt), passwordSalt: salt },
    siteName: "Online Store",
    upi: { address: "paytm.s31xj2l@pty", notePrefix: "Order Payment" },
    firebase: getEnvFirebase(),
    pixels: ["1066282156112556"],
    gaCodes: ["G-Z1E4R7P9TJ"],
    tokenSecret,
    cashfree: {
      enabled: process.env.CASHFREE_ENABLED === "true",
      environment: process.env.CASHFREE_ENVIRONMENT === "prod" ? "prod" : "sandbox",
      clientId: process.env.CASHFREE_CLIENT_ID || "",
      secretKey: process.env.CASHFREE_SECRET_KEY || "",
    },
  };
}

let settingsStore: AppSettings = defaultSettings();
const SETTINGS_DOC = "app";

// Load settings from Firestore (if available) or from local settings.json cache.
async function loadSettingsFromDb() {
  if (!db) return;
  try {
    const snap: any = await withTimeout(getDoc(doc(db, "settings", SETTINGS_DOC)) as any, 5000);
    if (snap && snap.exists()) {
      const data = snap.data() as any;
      // Merge so newly added fields always default correctly.
      const base = defaultSettings();
      if (data.admin?.username && data.admin?.passwordHash) {
        base.admin = { ...base.admin, ...data.admin };
      }
      if (data.firebase) base.firebase = { ...base.firebase, ...data.firebase };
      if (data.upi) base.upi = { ...base.upi, ...data.upi };
      if (data.siteName) base.siteName = data.siteName;
      if (Array.isArray(data.pixels)) base.pixels = data.pixels;
      if (Array.isArray(data.gaCodes)) base.gaCodes = data.gaCodes;
      if (data.tokenSecret) base.tokenSecret = data.tokenSecret;
      if (data.cashfree) base.cashfree = { ...base.cashfree, ...data.cashfree };
      settingsStore = base;
      console.log("Admin settings loaded from Firestore");
    } else {
      await withTimeout(setDoc(doc(db, "settings", SETTINGS_DOC), settingsStore as any) as any);
      console.log("Seeded admin settings into Firestore");
    }
  } catch (e) {
    console.warn("Could not load settings from Firestore:", e);
  }
}

// Persist settings to Firestore (silent failure -> in-memory only fallback).
async function persistSettings() {
  if (db) {
    try {
      await withTimeout(setDoc(doc(db, "settings", SETTINGS_DOC), settingsStore as any) as any);
    } catch (e) {
      console.warn("Persist settings error:", e);
    }
  }
  // Also cache locally so standalone mode survives restarts.
  try {
    fs.mkdirSync(path.resolve(process.cwd(), "data"), { recursive: true });
    fs.writeFileSync(
      path.resolve(process.cwd(), "data", "settings.json"),
      JSON.stringify(settingsStore, null, 2)
    );
  } catch {}
}

function loadSettingsFromFile() {
  try {
    const p = path.resolve(process.cwd(), "data", "settings.json");
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));
      const base = defaultSettings();
      if (data.admin?.username && data.admin?.passwordHash) base.admin = { ...base.admin, ...data.admin };
      if (data.firebase) base.firebase = { ...base.firebase, ...data.firebase };
      if (data.upi) base.upi = { ...base.upi, ...data.upi };
      if (data.siteName) base.siteName = data.siteName;
      if (Array.isArray(data.pixels)) base.pixels = data.pixels;
      if (Array.isArray(data.gaCodes)) base.gaCodes = data.gaCodes;
      if (data.tokenSecret) base.tokenSecret = data.tokenSecret;
      if (data.cashfree) base.cashfree = { ...base.cashfree, ...data.cashfree };
      settingsStore = base;
    }
  } catch {}
}

loadSettingsFromFile();
loadOrdersFromFile();

// --- Admin auth (stateless HMAC-signed token) ---
// Use a stable secret persisted in settings so tokens survive serverless cold starts
// and multiple lambda instances keep validating each other.
function currentTokenSecret(): string {
  return process.env.ADMIN_TOKEN_SECRET || settingsStore.tokenSecret || "admin-insecure-fallback";
}
const TOKEN_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

const { timingSafeEqual } = crypto;
function signToken(payload: string): string {
  return crypto.createHmac("sha256", currentTokenSecret()).update(payload).digest("hex");
}
function issueToken(username: string): string {
  const body = `${username}.${Date.now() + TOKEN_TTL}`;
  return `${body}.${signToken(body)}`;
}
function verifyToken(token: string): string | null {
  try {
    const [userPart, expPart, sig] = token.split(".");
    if (!userPart || !expPart || !sig) return null;
    const body = `${userPart}.${expPart}`;
    const expected = signToken(body);
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    if (Number(expPart) < Date.now()) return null;
    return userPart;
  } catch {
    return null;
  }
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  (req as any).adminUser = user;
  next();
}

// --- Public config endpoint (no auth) for the storefront to read dynamic settings ---
app.get("/api/config", (req, res) => {
  res.json({
    siteName: settingsStore.siteName,
    upi: settingsStore.upi,
    pixels: settingsStore.pixels,
    gaCodes: settingsStore.gaCodes,
    cashfree: {
      enabled: Boolean(settingsStore.cashfree?.enabled && settingsStore.cashfree?.clientId && settingsStore.cashfree?.secretKey),
      environment: settingsStore.cashfree?.environment === "prod" ? "prod" : "sandbox",
    },
  });
});

// ============================================================================
// Admin Auth endpoints
// ============================================================================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const admin = settingsStore.admin;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  if (username === admin.username) {
    const hash = hashPassword(String(password), admin.passwordSalt);
    const a = Buffer.from(hash);
    const b = Buffer.from(admin.passwordHash);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      const token = issueToken(admin.username);
      return res.json({ token, username: admin.username });
    }
  }
  res.status(401).json({ error: "Invalid username or password" });
});

app.get("/api/admin/me", authMiddleware, (req, res) => {
  res.json({ username: (req as any).adminUser, authenticated: true });
});

// --- Settings (protected) ---
app.get("/api/admin/settings", authMiddleware, (req, res) => {
  const s = settingsStore;
  res.json({
    siteName: s.siteName,
    upi: s.upi,
    firebase: {
      apiKey: s.firebase.apiKey,
      projectId: s.firebase.projectId,
      appId: s.firebase.appId,
      authDomain: s.firebase.authDomain,
      firestoreDatabaseId: s.firebase.firestoreDatabaseId,
      storageBucket: s.firebase.storageBucket,
      messagingSenderId: s.firebase.messagingSenderId,
    },
    pixels: s.pixels,
    gaCodes: s.gaCodes,
    cashfree: s.cashfree
      ? {
          enabled: Boolean(s.cashfree.enabled),
          environment: s.cashfree.environment || "sandbox",
          clientId: s.cashfree.clientId || "",
          secretKey: s.cashfree.secretKey || "",
        }
      : { enabled: false, environment: "sandbox", clientId: "", secretKey: "" },
  });
});

app.post("/api/admin/settings", authMiddleware, async (req, res) => {
  const b = req.body || {};
  try {
    if (b.siteName) settingsStore.siteName = String(b.siteName).slice(0, 60);
    if (b.upi) settingsStore.upi = { ...settingsStore.upi, ...b.upi };
    if (b.firebase) settingsStore.firebase = { ...settingsStore.firebase, ...b.firebase, firestoreDatabaseId: (b.firebase.firestoreDatabaseId || "(default)") };
    if (Array.isArray(b.pixels)) settingsStore.pixels = b.pixels.map(String).filter(Boolean);
    if (Array.isArray(b.gaCodes)) settingsStore.gaCodes = b.gaCodes.map(String).filter(Boolean);
    if (b.cashfree) {
      settingsStore.cashfree = {
        enabled: Boolean(b.cashfree.enabled),
        environment: b.cashfree.environment === "prod" ? "prod" : "sandbox",
        clientId: String(b.cashfree.clientId || "").trim(),
        secretKey: String(b.cashfree.secretKey || "").trim(),
      };
    }
    await persistSettings();
    // If Firebase credentials changed, reconnect immediately so orders read/write
    // against the new database.
    try { db = connectFirestore(settingsStore.firebase); } catch {}
    invalidateOrdersCache();
    res.json({ success: true, settings: {
      siteName: settingsStore.siteName,
      upi: settingsStore.upi,
      firebase: settingsStore.firebase,
      pixels: settingsStore.pixels,
      gaCodes: settingsStore.gaCodes,
      cashfree: settingsStore.cashfree,
    }});
  } catch (e: any) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// --- Change admin password (protected) ---
app.post("/api/admin/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const admin = settingsStore.admin;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "All fields required" });
  if (String(newPassword).length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
  const currHash = hashPassword(String(currentPassword), admin.passwordSalt);
  const a = Buffer.from(currHash);
  const b = Buffer.from(admin.passwordHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  const salt = crypto.randomBytes(16).toString("hex");
  settingsStore.admin = {
    username: admin.username,
    passwordHash: hashPassword(String(newPassword), salt),
    passwordSalt: salt,
  };
  await persistSettings();
  res.json({ success: true });
});

// Cache Firestore reads with a short TTL so the admin pages that auto-poll
// every few seconds do not hammer the database with a full collection read
// each time. The cache is invalidated whenever an order is written.
const ORDERS_CACHE_TTL_MS = 4000;
let ordersCache: any[] | null = null;
let ordersCacheAt = 0;

function invalidateOrdersCache() {
  ordersCache = null;
  ordersCacheAt = 0;
}

// Realtime push to connected admin clients via Server-Sent Events (SSE).
// When an order is created or updated the server broadcasts an event so the
// admin panel updates instantly instead of polling / reloading the whole page.
const adminClients = new Set<express.Response>();

function broadcastOrdersChanged(payload: { type: "created" | "updated" | "deleted"; order: any }) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of adminClients) {
    try { res.write(data); } catch { adminClients.delete(res); }
  }
}

function broadcastAllOrders() {
  const data = `data: ${JSON.stringify({ type: "refresh" })}\n\n`;
  for (const res of adminClients) {
    try { res.write(data); } catch { adminClients.delete(res); }
  }
}

// Realtime stream endpoint (protected). Keeps the connection open and pushes
// order events to the connected admin client.
app.get("/api/admin/orders/stream", authMiddleware, (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 3000\n\n");
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  adminClients.add(res);
  req.on("close", () => adminClients.delete(res));
});

// --- Admin orders: realtime aggregate from Firestore with product details ---
async function readOrders(force = false): Promise<any[]> {
  if (!force && ordersCache && Date.now() - ordersCacheAt < ORDERS_CACHE_TTL_MS) {
    return ordersCache;
  }
  let fromDb: any[] | null = null;
  if (db) {
    try {
      const snap: any = await withTimeout(getDocs(collection(db, "orders")) as any);
      if (snap && !snap.empty) {
        fromDb = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn("Firestore read orders error:", e);
    }
  }
  // Prefer the source that has data so the panel never shows empty after a
  // cold-start or temporary database failure. Keep both copies consistent.
  if (fromDb && fromDb.length >= ordersStore.length) {
    ordersCache = fromDb;
    ordersCacheAt = Date.now();
    ordersStore = fromDb;
    return fromDb;
  }
  ordersCache = [...ordersStore];
  ordersCacheAt = Date.now();
  return ordersCache!;
}

app.get("/api/admin/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await readOrders();
    const { from, to } = req.query;
    // Optional date range filter by order date (createdAt or paymentDate).
    const filtered = filterOrdersByDate(orders, from, to);
    // Sort newest first
    filtered.sort((a: any, b: any) => {
      const da = a.createdAt || a.paymentDate || "";
      const db_ = b.createdAt || b.paymentDate || "";
      return String(db_).localeCompare(String(da));
    });
    res.json({ orders: filtered, range: { from: from || null, to: to || null } });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to load orders" });
  }
});

app.post("/api/admin/orders/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body || {};
  const valid = ["Pending", "Confirmed", "Paid", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
  if (!valid.includes(String(status))) return res.status(400).json({ error: "Invalid status" });
  invalidateOrdersCache();
  try {
    let updated = false;
    if (db) {
      const result: any = await withTimeout(setDoc(doc(db, "orders", req.params.id), { status }, { merge: true }) as any);
      if (result !== null) updated = true;
    }
    const idx = ordersStore.findIndex((o: any) => o.id === req.params.id);
    if (idx !== -1) {
      ordersStore[idx].status = status;
      updated = true;
    }
    if (!updated) return res.status(404).json({ error: "Order not found" });
    persistOrdersToFile();
    broadcastOrdersChanged({ type: "updated", order: { id: req.params.id, status } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to update order" });
  }
});

// --- Admin users: aggregate unique customers from orders ---
app.get("/api/admin/users", authMiddleware, async (req, res) => {
  try {
    const orders = await readOrders();
    const map = new Map<string, any>();
    for (const o of orders) {
      const key = o.customerPhone || o.phone || o.email || o.id || "unknown";
      const existing = map.get(key);
      const orderCount = existing ? existing.orderCount + 1 : 1;
      const spent = (existing ? existing.totalSpent : 0) + (Number(o.totalResellAmount) || Number(o.totalWholesaleAmount) || 0);
      map.set(key, {
        id: key,
        name: o.customerName || "Unknown",
        phone: o.customerPhone || o.phone || "",
        email: o.email || "",
        city: o.city || "",
        lastOrderAt: o.createdAt || o.paymentDate || "",
        orderCount,
        totalSpent: spent,
      });
    }
    const users = Array.from(map.values());
    users.sort((a: any, b: any) => String(b.lastOrderAt).localeCompare(String(a.lastOrderAt)));
    res.json({ users });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to load users" });
  }
});

// --- Admin dashboard stats ---
// Filter orders by an inclusive date range (dates as YYYY-MM-DD strings).
// An order belongs to a day based on its createdAt or paymentDate.
function filterOrdersByDate(orders: any[], from: any, to: any): any[] {
  const fromDate = typeof from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : null;
  const toDate = typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : null;
  if (!fromDate && !toDate) return orders;
  return orders.filter((o: any) => {
    const day = String((o.createdAt || o.paymentDate) || "").slice(0, 10);
    if (!day) return true; // no date -> always include
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    return true;
  });
}

function computeStats(orders: any[]) {
  let totalOrders = orders.length;
  let paidOrders = 0;
  let totalCollection = 0;
  let pendingOrders = 0;
  let margin = 0;
  const today = new Date().toISOString().slice(0, 10);
  let todayOrders = 0;
  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    const st = o.status || "Pending";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    if (st === "Paid") {
      paidOrders++;
      totalCollection += Number(o.paymentAmount) || Number(o.totalResellAmount) || Number(o.totalWholesaleAmount) || 0;
    }
    if (st === "Pending" || st === "Confirmed") pendingOrders++;
    margin += Number(o.totalMarginEarned) || 0;
    if (String(o.createdAt || o.paymentDate || "").slice(0, 10) === today) todayOrders++;
  }
  const users = new Set<string>();
  orders.forEach((o: any) => { if (o.customerPhone || o.phone) users.add(o.customerPhone || o.phone); });
  const revenue = orders.reduce((acc, o) => acc + (Number(o.totalResellAmount) || Number(o.totalWholesaleAmount) || 0), 0);
  // Total amount that should be collected across all orders vs. what is paid.
  const totalBillable = orders.reduce((acc, o) => acc + (Number(o.totalResellAmount) || Number(o.totalWholesaleAmount) || Number(o.paymentAmount) || 0), 0);
  const remainingToCollect = Math.max(0, totalBillable - totalCollection);
  return {
    totalOrders,
    paidOrders,
    totalCollection,
    pendingOrders,
    margin,
    todayOrders,
    totalUsers: users.size,
    revenue,
    remainingToCollect,
    statusCounts,
  };
}

app.get("/api/admin/stats", authMiddleware, async (req, res) => {
  try {
    const orders = await readOrders();
    const { from, to } = req.query;
    const filtered = filterOrdersByDate(orders, from, to);
    res.json({ ...computeStats(filtered), range: { from: from || null, to: to || null }, allOrdersCount: orders.length });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// Auth a password against the stored admin credentials (used by refresh).
function verifyAdminPassword(password: string): boolean {
  const admin = settingsStore.admin;
  if (!admin || !admin.passwordHash) return false;
  const hash = hashPassword(String(password), admin.passwordSalt);
  const a = Buffer.from(hash);
  const b = Buffer.from(admin.passwordHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Force a full recompute from the source. Requires the admin password so a
// stale cached dashboard can be rebuilt from scratch (counts from the very
// first order up to now). The token alone is not enough — the admin must
// confirm their password.
app.post("/api/admin/stats/refresh", authMiddleware, async (req, res) => {
  try {
    const { password, from, to } = req.body || {};
    if (!password) return res.status(400).json({ error: "Password required" });
    if (!verifyAdminPassword(String(password))) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    invalidateOrdersCache();
    const orders = await readOrders(true); // bypass the TTL cache
    const filtered = filterOrdersByDate(orders, from, to);
    const stats = computeStats(filtered);
    res.json({ success: true, stats });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to refresh stats" });
  }
});

// ============================================================================
// Hard Reset: permanently delete ALL collected data (orders, visitors,
// analytics, purchases). Requires the admin password to prevent accidents.
// ============================================================================
app.post("/api/admin/hard-reset", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: "Password required" });
    if (!verifyAdminPassword(String(password))) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // 1. Clear all orders from Firestore.
    if (db) {
      try {
        const snap: any = await withTimeout(getDocs(collection(db, "orders")) as any);
        if (snap && !snap.empty) {
          for (const d of snap.docs) {
            await withTimeout(setDoc(doc(db, "orders", d.id), { deleted: true, deletedAt: new Date().toISOString() }) as any);
          }
        }
      } catch (e) {
        console.warn("Hard reset Firestore orders error:", e);
      }
    }

    // 2. Clear in-memory orders store.
    ordersStore = [];
    invalidateOrdersCache();

    // 3. Clear local orders.json cache.
    try {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
    } catch {}

    // 4. Reset analytics counters.
    visitors.clear();
    totalVisits = 0;
    totalPageViews = 0;
    visitsToday = 0;
    viewsToday = 0;

    // 5. Notify connected admin clients.
    broadcastAllOrders();

    res.json({ success: true, message: "All data has been permanently deleted." });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to reset data" });
  }
});

// Ensure settings are loaded from db once initialized
loadSettingsFromDb().then(() => {
  // Reconnect against whatever firebase config got loaded (env / file / db).
  initDbFromSettings();
});

// Boot-time connection (env / file based) used before the db load resolves.
initDbFromSettings();


// 1. Categories
app.get("/api/categories", (req, res) => {
  res.json(dbData.categories || []);
});

app.post("/api/categories", (req, res) => {
  try {
    const { name, image, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const exists = (dbData.categories || []).some((c: any) => c.id === id);
    if (exists) return res.status(400).json({ error: "Exists" });
    const newCat = { id, name, icon: icon || "Tag", image: image || "" };
    dbData.categories = [...(dbData.categories || []), newCat];
    res.status(201).json(newCat);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

app.delete("/api/categories/:id", (req, res) => {
  dbData.categories = (dbData.categories || []).filter((c: any) => c.id !== req.params.id);
  res.json({ success: true });
});

// 2. Products
app.get("/api/products", (req, res) => {
  try {
    let products = [...(dbData.products || [])];
    const { category, search, sort } = req.query;

    if (category && category !== "all") {
      const catStr = String(category).toLowerCase();
      products = products.filter((p: any) => {
        const pCat = (p.category || "").toLowerCase();
        return pCat === catStr || pCat.includes(catStr) || catStr.includes(pCat);
      });
    }

    if (search) {
      const s = String(search).toLowerCase();
      products = products.filter((p: any) => 
        (p.title || p.name || "").toLowerCase().includes(s) || 
        (p.description || "").toLowerCase().includes(s)
      );
    }

    if (sort === "price-low") {
      products.sort((a: any, b: any) => Number(a.wholesalePrice || a.price || 0) - Number(b.wholesalePrice || b.price || 0));
    } else if (sort === "price-high") {
      products.sort((a: any, b: any) => Number(b.wholesalePrice || b.price || 0) - Number(a.wholesalePrice || a.price || 0));
    } else if (sort === "newest") {
      products.sort((a: any, b: any) => String(b.id || "").localeCompare(String(a.id || "")));
    }

    res.json(products);
  } catch (err) {
    res.json(dbData.products || []);
  }
});

app.get("/api/products/:id", (req, res) => {
  const found = (dbData.products || []).find((p: any) => p.id === req.params.id);
  if (found) return res.json(found);
  res.status(404).json({ error: "Not found" });
});

app.post("/api/products", (req, res) => {
  try {
    const raw = req.body;
    const newProduct = {
      ...raw,
      id: raw.id || `prod-${Date.now()}`,
      wholesalePrice: Number(raw.wholesalePrice || raw.price || 99),
      suggestedResellPrice: Number(raw.suggestedResellPrice || raw.resellPrice || raw.wholesalePrice || 99),
      rating: Number(raw.rating || 4.5),
      reviewsCount: Number(raw.reviewsCount || 10),
      createdAt: new Date().toISOString()
    };
    dbData.products = [newProduct, ...(dbData.products || [])];
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.delete("/api/products/:id", (req, res) => {
  dbData.products = (dbData.products || []).filter((p: any) => p.id !== req.params.id);
  res.json({ success: true });
});

app.delete("/api/products", (req, res) => {
  dbData.products = [];
  res.json({ success: true });
});

// 3. Cart
app.get("/api/cart", (req, res) => {
  const enrichedCart = cartStore.map((item: any) => {
    const product = (dbData.products || []).find((p: any) => p.id === item.productId);
    return { ...item, product };
  });
  res.json(enrichedCart);
});

app.post("/api/cart", (req, res) => {
  try {
    const { productId, selectedSize, selectedColor, resellPrice, quantity } = req.body;
    const qty = Number(quantity) || 1;
    const existing = cartStore.find(i => 
      i.productId === productId && 
      (!selectedSize || i.selectedSize === selectedSize) && 
      (!selectedColor || i.selectedColor === selectedColor)
    );

    if (existing) {
      existing.quantity += qty;
      existing.resellPrice = resellPrice || existing.resellPrice;
      return res.json({ success: true, updated: true, item: existing });
    }

    const newItem = {
      id: `cart-${Date.now()}`,
      productId,
      quantity: qty,
      selectedSize: selectedSize || null,
      selectedColor: selectedColor || null,
      resellPrice: resellPrice || 0
    };
    cartStore.push(newItem);
    res.json({ success: true, item: newItem });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/cart/bulk", (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    for (const it of items) {
      const newItem = {
        id: `cart-${Date.now()}-${Math.random()}`,
        productId: it.productId,
        quantity: Number(it.quantity) || 1,
        selectedSize: it.selectedSize || null,
        selectedColor: it.selectedColor || null,
        resellPrice: it.resellPrice || 0
      };
      cartStore.push(newItem);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/cart/set-quantity", (req, res) => {
  const { productId, quantity, selectedSize, selectedColor, resellPrice } = req.body;
  const targetQty = Number(quantity);
  const existingIdx = cartStore.findIndex(d => d.productId === productId);

  if (targetQty <= 0) {
    if (existingIdx !== -1) cartStore.splice(existingIdx, 1);
    return res.json({ success: true, deleted: true });
  }

  if (existingIdx !== -1) {
    cartStore[existingIdx].quantity = targetQty;
    cartStore[existingIdx].resellPrice = resellPrice || cartStore[existingIdx].resellPrice;
    return res.json({ success: true, updated: true });
  }

  const newItem = {
    id: `cart-${Date.now()}`,
    productId,
    quantity: targetQty,
    selectedSize: selectedSize || null,
    selectedColor: selectedColor || null,
    resellPrice: resellPrice || 0
  };
  cartStore.push(newItem);
  res.json({ success: true, item: newItem });
});

app.patch("/api/cart/:id", (req, res) => {
  const idx = cartStore.findIndex(c => c.id === req.params.id);
  if (idx !== -1) {
    if (req.body.quantity !== undefined && Number(req.body.quantity) <= 0) {
      cartStore.splice(idx, 1);
      return res.json({ success: true, deleted: true });
    }
    cartStore[idx] = { ...cartStore[idx], ...req.body };
    return res.json({ success: true, item: cartStore[idx] });
  }
  res.status(404).json({ error: "Not found" });
});

app.delete("/api/cart/:id", (req, res) => {
  cartStore = cartStore.filter(c => c.id !== req.params.id);
  res.json({ success: true });
});

// 4. Orders
app.get("/api/orders", async (req, res) => {
  if (db) {
    try {
      const snap: any = await withTimeout(getDocs(collection(db, "orders")) as any);
      if (snap && !snap.empty) {
        return res.json(snap.docs.map(d => d.data()));
      }
    } catch (e) {
      console.warn("Firestore get orders error:", e);
    }
  }
  res.json(ordersStore);
});

// Public endpoint for the Paytm scanner: recent orders that are not yet Paid,
// so payments whose UPI note did NOT carry the ORD-ID reference can still be
// matched to an order by amount + creation time.
app.get("/api/listener/pending", async (req, res) => {
  try {
    const orders = await readOrders();
    const cutoffMs = Date.now() - 60 * 60 * 1000;
    const pending = (orders || [])
      .filter((o: any) => {
        if (String(o.status || "").toLowerCase() === "paid") return false;
        const created = new Date(String(o.createdAt || o.paymentDate || "")).getTime();
        return Number.isFinite(created) && Date.now() - created <= cutoffMs;
      })
      .map((o: any) => ({
        id: o.id,
        amount: Number(o.totalResellAmount) || Number(o.totalWholesaleAmount) || Number(o.paymentAmount) || 0,
        createdAt: o.createdAt || o.paymentDate || "",
        status: o.status || "Pending",
        customerName: o.customerName || "",
      }));
    res.json({ orders: pending, serverTime: new Date().toISOString() });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to load pending orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const orderId = req.body.id || `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const order = {
      id: orderId,
      ...req.body,
      status: req.body.status || "Confirmed",
      createdAt: new Date().toISOString()
    };
    ordersStore.unshift(order);
    cartStore = [];
    invalidateOrdersCache();

    // Persist to Firestore + local cache so the order survives restarts /
    // cold-starts even if the database is temporarily unavailable.
    if (db) {
      const orderRef = doc(db, "orders", orderId);
      withTimeout(setDoc(orderRef, order) as any);
    }
    persistOrdersToFile();

    broadcastOrdersChanged({ type: "created", order });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

app.post("/api/orders/verify", async (req, res) => {
  try {
    const { orderId, amount, status } = req.body;
    let order: any = null;
    invalidateOrdersCache();

    if (db) {
      try {
        const orderRef = doc(db, "orders", orderId);
        const d: any = await withTimeout(getDoc(orderRef) as any);
        if (d && d.exists()) {
          order = d.data();
          if (status === 'Paid') {
            order.status = 'Paid';
            order.paymentAmount = amount;
            order.paymentDate = new Date().toISOString();
          } else {
            order.status = status;
          }
          await withTimeout(setDoc(orderRef, order) as any);
        }
      } catch (e) {
        console.warn("Firestore verify order error:", e);
      }
    }

    if (!order) {
      order = ordersStore.find(o => o.id === orderId);
      if (order) {
        if (status === 'Paid') {
          order.status = 'Paid';
          order.paymentAmount = amount;
          order.paymentDate = new Date().toISOString();
        } else {
          order.status = status;
        }
      }
    }
    if (order) persistOrdersToFile();

    if (order) {
      broadcastOrdersChanged({ type: "updated", order: { id: order.id, status: order.status, ...(status === 'Paid' ? { paymentAmount: order.paymentAmount, paymentDate: order.paymentDate } : {}) } });
      return res.json({ success: true, order });
    }
    res.status(404).json({ error: "Order not found" });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ============================================================================
// Cashfree Payment Gateway integration
//
// Flow:
//   1. Storefront calls POST /api/payments/cashfree/create with an order id +
//      amount. The server creates a Cashfree order and returns a
//      payment_session_id, which the client uses to open the hosted checkout.
//   2. Customer pays on Cashfree's hosted page and is redirected to our
//      return_url (/checkout/payment?order_id=...), where the payment screen
//      polls order status.
//   3. Cashfree posts a webhook (PAYMENT_SUCCESS_WEBHOOK /
//      PAYMENT_FAILED_WEBHOOK) to /api/payments/cashfree/webhook. The server
//      verifies the HMAC signature, then marks the order Paid or Failed so the
//      admin panel always shows the true, server-confirmed status.
// ============================================================================
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || "2022-09-01";

function getBaseOrigin(req: express.Request): string {
  const origin = req.headers.origin;
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/+$/, "");
  const host = req.headers.host || "localhost:3000";
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  return `${proto}://${host}`;
}

function cashfreeBaseUrl(): string {
  return settingsStore.cashfree?.environment === "prod"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

// Thin wrapper around the Cashfree PG REST API.
async function cashfreeRequest<T = any>(path: string, method = "GET", body?: any): Promise<{ ok: boolean; status: number; data: T }> {
  const cf = settingsStore.cashfree;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-api-version": CASHFREE_API_VERSION,
    "x-client-id": cf?.clientId || "",
    "x-client-secret": cf?.secretKey || "",
  };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${cashfreeBaseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

// Apply a payment update to an order across Firestore, the local store, the
// local JSON cache and live admin clients (single source of truth).
function updateOrderFields(orderId: string, patch: Record<string, any>) {
  invalidateOrdersCache();
  let order: any = null;
  if (db) {
    try {
      withTimeout(setDoc(doc(db, "orders", orderId), patch, { merge: true }) as any);
    } catch {}
  }
  const idx = ordersStore.findIndex((o: any) => o.id === orderId);
  if (idx !== -1) {
    ordersStore[idx] = { ...ordersStore[idx], ...patch };
    order = ordersStore[idx];
  }
  if (order) {
    persistOrdersToFile();
    broadcastOrdersChanged({ type: "updated", order: { id: orderId, ...patch } });
  }
  return order;
}

// Create a Cashfree order for a local order (returns payment_session_id).
app.post("/api/payments/cashfree/create", async (req, res) => {
  const cf = settingsStore.cashfree;
  if (!cf || !cf.enabled || !cf.clientId || !cf.secretKey) {
    return res.status(400).json({ error: "Cashfree is not configured yet. Add your API keys in the admin panel." });
  }
  const { orderId, amount, customer = {} } = req.body || {};
  const orderAmount = Math.round((Number(amount) || 0) * 100) / 100;
  if (!orderId) return res.status(400).json({ error: "Order id is required" });
  if (orderAmount < 1) return res.status(400).json({ error: "Invalid order amount" });

  const cleanId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const returnUrl = `${getBaseOrigin(req)}/checkout/payment?order_id=${encodeURIComponent(String(orderId))}`;
  const phone = String(customer.phone || "").replace(/\D/g, "").slice(-10);
  const email = String(customer.email || "").slice(0, 100);

  const payload: any = {
    order_id: cleanId,
    order_amount: orderAmount,
    order_currency: "INR",
    customer_details: {
      customer_id: `cust_${cleanId}`.slice(0, 50),
      customer_name: String(customer.name || "Customer").slice(0, 100),
      customer_phone: phone.length === 10 ? phone : "9999999999",
      ...(email ? { customer_email: email } : {}),
    },
    order_meta: { return_url: returnUrl },
    order_note: `Order ${orderId}`,
    order_tags: {
      order_id: String(orderId),
      checkout_context: `${settingsStore.siteName || "Store"} order ${orderId}`,
    },
  };

  const { ok, status, data } = await cashfreeRequest<any>("/orders", "POST", payload);
  if (!ok) {
    console.warn("Cashfree create order failed:", status, JSON.stringify(data));
    return res.status(502).json({ error: (data as any)?.message || "Cashfree order creation failed" });
  }

  updateOrderFields(String(orderId), {
    paymentMethod: "Cashfree",
    status: "Pending",
    cashfree: {
      sessionId: data.payment_session_id,
      cfOrderId: data.cf_order_id,
      environment: cf.environment,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    },
  });

  return res.json({
    success: true,
    paymentSessionId: data.payment_session_id,
    cfOrderId: data.cf_order_id,
    orderStatus: data.order_status,
    environment: cf.environment,
  });
});

// Cashfree webhook endpoint (configure this URL in the Cashfree dashboard:
//  POST /api/payments/cashfree/webhook, events PAYMENT_SUCCESS_WEBHOOK +
//  PAYMENT_FAILED_WEBHOOK). Signature = base64(HMAC-SHA256(timestamp + rawBody)).
app.post("/api/payments/cashfree/webhook", async (req, res) => {
  const cf = settingsStore.cashfree;
  if (!cf || !cf.secretKey) return res.status(400).json({ error: "Cashfree not configured" });

  const signature = String(req.headers["x-webhook-signature"] || "");
  const timestamp = String(req.headers["x-webhook-timestamp"] || "");
  if (!signature || !timestamp) {
    return res.status(400).json({ error: "Missing webhook signature headers" });
  }

  // Verify authenticity: HMAC-SHA256 over (timestamp + rawBody) with the
  // Cashfree secret key, base64-encoded, compared to x-webhook-signature.
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const expected = crypto.createHmac("sha256", cf.secretKey).update(timestamp + rawBody).digest("base64");
  const okSig = expected === signature;
  if (!okSig) {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
  }

  // Acknowledge immediately so Cashfree never retries; update the order after.
  res.json({ success: true });

  try {
    const body = req.body || {};
    const type = String(body.type || "");
    if (!["PAYMENT_SUCCESS_WEBHOOK", "PAYMENT_FAILED_WEBHOOK", "PAYMENT_USER_DROPPED_WEBHOOK"].includes(type)) {
      return;
    }
    const data = body.data || {};
    const orderId = data.order?.order_id || data.payment?.order_id;
    if (!orderId) return;

    // A single order can have several payment attempts; use any successful
    // payment, otherwise the newest payment for that order.
    const payments = Array.isArray(data.payments) && data.payments.length
      ? data.payments
      : data.payment ? [data.payment] : [];
    const successPayment = payments.find((p: any) => String(p.payment_status || "").toUpperCase() === "SUCCESS");
    const payment = successPayment || payments[payments.length - 1];
    if (!payment) return;

    if (type === "PAYMENT_SUCCESS_WEBHOOK" && successPayment) {
      const paid: Record<string, any> = {
        status: "Paid",
        paymentStatus: "SUCCESS",
        paidThrough: "cashfree",
        paymentMethod: "Cashfree",
        paymentAmount: Number(payment.payment_amount) || Number(data.order?.order_amount) || 0,
        paymentDate: payment.payment_completion_time || payment.payment_time || new Date().toISOString(),
        paymentUtr: payment.bank_reference || payment.auth_id || "",
        paymentError: null,
        paymentFailedByGateway: false,
        failedAt: null,
        cfOrderId: data.order?.cf_order_id || data.order?.order_id || String(orderId),
        cfPaymentId: payment.cf_payment_id || "",
        cashfree: {
          sessionId: payment.session_id || undefined,
          cfOrderId: data.order?.cf_order_id || String(orderId),
          cfPaymentId: payment.cf_payment_id || "",
          paymentStatus: "SUCCESS",
          bankReference: payment.bank_reference || "",
          paymentTime: payment.payment_time || null,
          gatewayName: data.payment_gateway_details?.gateway_name || "",
          paymentMethodRaw: payment.payment_method || null,
        },
      };
      const paymentMethodKey = payment.payment_group || "";
      if (paymentMethodKey) paid.paymentGroup = paymentMethodKey;
      updateOrderFields(String(orderId), paid);
      console.log(`Cashfree webhook: order ${orderId} marked PAID (cf ${payment.cf_payment_id || ""})`);
    } else {
      const paymentMessage = payment.payment_message
        || payment.error_details?.error_description
        || (type === "PAYMENT_USER_DROPPED_WEBHOOK" ? "Customer cancelled payment" : "Payment was not successful");
      updateOrderFields(String(orderId), {
        status: "Failed",
        paymentStatus: String(payment.payment_status || "FAILED").toUpperCase(),
        paidThrough: "cashfree",
        paymentMethod: "Cashfree",
        paymentFailedByGateway: true,
        paymentError: paymentMessage,
        failedAt: new Date().toISOString(),
        cfPaymentId: payment.cf_payment_id || String(orderId),
      });
      console.log(`Cashfree webhook: order ${orderId} marked FAILED (${paymentMessage})`);
    }
  } catch (e) {
    console.warn("Cashfree webhook processing error:", e);
  }
});

app.get("/api/orders/:id/status", async (req, res) => {
  try {
    let order: any = null;
    if (db) {
      try {
        const d: any = await withTimeout(getDoc(doc(db, "orders", req.params.id)) as any);
        if (d && d.exists()) order = d.data();
      } catch (e) {}
    }
    if (!order) order = ordersStore.find(o => o.id === req.params.id);
    if (order) {
      return res.json({
        status: order.status,
        paymentAmount: order.paymentAmount || null,
        paymentDate: order.paymentDate || null,
        paymentMethod: order.paymentMethod || null,
        paidThrough: order.paidThrough || null,
        cfOrderId: order.cfOrderId || order.cashfree?.cfOrderId || null,
        cfPaymentId: order.cfPaymentId || order.cashfree?.cfPaymentId || null,
        paymentUtr: order.paymentUtr || null,
        paymentFailed: order.paymentFailedByGateway === true,
        paymentError: order.paymentError || null,
      });
    }
    res.status(404).json({ error: "Order not found" });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});


// 5. AI
app.post("/api/ai/generate-caption", async (req, res) => {
  try {
    const { title, wholesalePrice, resellPrice, description } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.json({ caption: `✨ *${title || "Trending"}* ✨\n\n${description || "Best quality!"}\n\n💰 *Price:* ₹${resellPrice || wholesalePrice || 99}/-\n🚚 *Free COD!*` });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Write an engaging WhatsApp caption for a Meesho reseller:\nProduct: ${title}\nDesc: ${description}\nPrice: ₹${resellPrice || wholesalePrice}\nInclude Free Home Delivery & COD.`
    });
    res.json({ caption: response.text });
  } catch (err: any) { res.json({ caption: `✨ *${req.body.title || "Special Deal"}* ✨\n\n${req.body.description || "Top rated product!"}\n\n💰 *Price:* ₹${req.body.resellPrice || req.body.wholesalePrice || 99}/-\n🚚 *Free Shipping + Cash On Delivery Available!*\n\n👇 Send message to order now!` }); }
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// On Vercel: rewrites in vercel.json route /api/* to this function and all other
// routes to /index.html, which Vercel serves statically from dist/

async function setupStaticServing() {
  if (process.env.VERCEL) return;

  const distPath = path.resolve(process.cwd(), "dist");
  const isProd = process.env.NODE_ENV === "production" || fs.existsSync(distPath);

  if (isProd) {
    console.log("Serving dist from:", distPath);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Error: index.html not found in dist folder. Please run build.");
      }
    });
  } else {
    console.log("Starting in DEVELOPMENT mode with Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json({ error: "Service Unavailable" });
});

async function startServer() {
  const port = 3000;
  await setupStaticServing();
  if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${port}`);
    });
  }
}

startServer().catch(() => {});

export default app;
export { app };

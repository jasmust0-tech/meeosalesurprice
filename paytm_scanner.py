import sys
import time
import json
import os
import re
import threading
import requests
import urllib3
from datetime import datetime, timedelta, timezone

# Disable SSL warnings if needed (Paytm certs sometimes flagged)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# ==========================================
# CONFIGURATION  (mirrors the Node.js auto-fetcher)
# ==========================================
DEFAULT_WEBSITE_URL = "https://self-nine-wine.vercel.app/"
CHROME_DEBUG_URL = "127.0.0.1:9222"
PAYTM_TRANSACTIONS_URL = "https://dashboard.paytm.com/next/transactions"
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "paytm_scan_state.json")

USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36")

ORDER_ID_RE = re.compile(r"ORD-?\d{4,8}", re.IGNORECASE)

website_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_WEBSITE_URL
WEBSITE_API_URL = website_url.rstrip("/")
VERIFY_URL = f"{WEBSITE_API_URL}/api/orders/verify"
STATUS_URL = f"{WEBSITE_API_URL}/api/listener/status"

# ==========================================
# TIMING / SESSION CONFIG
# ==========================================
POLL_INTERVAL = int(os.environ.get("PAYTM_POLL_INTERVAL", "10"))          # seconds
AUTO_REFRESH_INTERVAL = int(os.environ.get("PAYTM_REFRESH_INTERVAL", "300"))  # 5 min
SESSION_KEEP_ALIVE_INTERVAL = 2 * 60                                        # 2 min
LOGIN_CHECK_INTERVAL = 10                                                   # 10 sec
UNLOCK_COOLDOWN = 60                                                        # 60 sec
SESSION_IDLE_TIMEOUT = 30 * 60                                              # 30 min

# ==========================================
# SESSION STATE  (like sessionState in Node)
# ==========================================
session = {
    "isLocked": False,
    "isLoggedIn": False,
    "consecutiveFailures": 0,
    "maxFailures": 5,
    "tokenExpiryMs": None,
    "lastSuccessfulFetch": None,
    "unlockInProgress": False,
    "lastUnlockAttempt": 0,
    "manualInterventionRequired": False,
    "lastAutoRefresh": 0,
    "loginPageDetected": False,
    "lastLoginCheck": 0,
    "lastKeepAlive": None,
    "keepAliveCount": 0,
    "sessionStartTime": None,
}

# Thread lock so refresh and scan don't race
scan_lock = threading.Lock()

processed_txn_ids = set()
MAX_PROCESSED_HISTORY = 1000


# ==========================================
# HELPERS
# ==========================================
def get_timestamp():
    return datetime.now().strftime("[%H:%M:%S]")


def log(message, type="INFO"):
    emojis = {
        "INFO": "ℹ️", "SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️",
        "DEBUG": "🔍", "ACTION": "⚡", "LOCK": "🔒", "UNLOCK": "🔓",
        "AUTH": "🔑", "REFRESH": "🔄", "ALERT": "🔔", "LOGIN": "👤",
        "KEEPALIVE": "💚",
    }
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{emojis.get(type, '📌')} [{ts}] [{type}] {message}")


def load_state():
    global processed_txn_ids
    try:
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, "r") as f:
                processed_txn_ids = set(json.load(f).get("processed", []))
        session["sessionStartTime"] = time.time()
        session["lastKeepAlive"] = time.time()
    except Exception:
        processed_txn_ids = set()


def save_state():
    try:
        with open(STATE_FILE, "w") as f:
            json.dump({"processed": sorted(processed_txn_ids)}, f)
    except Exception as e:
        log(f"Could not save state: {e}", "WARNING")


# ==========================================
# CHROME CONNECTION  (via Selenium debug port)
# ==========================================
def init_chrome_driver():
    chrome_options = Options()
    chrome_options.add_experimental_option("debuggerAddress", CHROME_DEBUG_URL)
    try:
        driver = webdriver.Chrome(options=chrome_options)
        log("Connected to Chrome browser on port 9222 successfully!", "SUCCESS")
        return driver
    except Exception as e:
        log(f"Failed to connect to Chrome: {e}", "ERROR")
        return None


# ==========================================
# TAB / COOKIE HANDLING  (mirrors getPaytmTab + getCookiesFromChrome)
# ==========================================
def find_paytm_tab(driver):
    for window in driver.window_handles:
        try:
            driver.switch_to.window(window)
            url = driver.current_url
        except Exception:
            continue
        if "paytm.com" in url or "dashboard.paytm" in url:
            return window
    # fall back: any tab whose title mentions paytm
    for window in driver.window_handles:
        try:
            driver.switch_to.window(window)
            title = driver.title.lower()
        except Exception:
            continue
        if "paytm" in title:
            return window
    return None


def get_paytm_cookies(driver):
    try:
        tab = find_paytm_tab(driver)
        if tab:
            driver.switch_to.window(tab)
        cookies = driver.get_cookies()
        if not cookies:
            return None
        cookie_header = "; ".join(f"{c['name']}={c['value']}" for c in cookies)
        xsrf_obj = next((c for c in cookies if c["name"] == "XSRF-TOKEN"), None)
        xsrf_token = xsrf_obj["value"] if xsrf_obj else ""
        return {"cookieHeader": cookie_header, "xsrfToken": xsrf_token}
    except Exception as e:
        log(f"Error getting cookies: {e}", "ERROR")
        return None


def reload_paytm_tab(driver):
    try:
        tab = find_paytm_tab(driver)
        if tab is None:
            return False
        driver.switch_to.window(tab)
        driver.refresh()
        return True
    except Exception as e:
        log(f"Could not refresh Paytm tab: {e}", "WARNING")
        return False


# ==========================================
# SESSION KEEP-ALIVE  (mirrors keepSessionAlive)
# ==========================================
def keep_session_alive(driver):
    try:
        tab = find_paytm_tab(driver)
        if tab is None:
            return False
        driver.switch_to.window(tab)

        # Gently interact with the page to keep session fresh
        driver.execute_script("""
          (() => {
            let clicked = false;
            const safeSelectors = [
              'nav a:not([href*="logout"])',
              '.sidebar a:first-child',
              '.dashboard-menu a:first-child',
              '[class*="nav"] a:first-child',
              '.header a:first-child',
              '.logo a'
            ];
            for (const selector of safeSelectors) {
              const el = document.querySelector(selector);
              if (el && el.offsetParent !== null) {
                try { el.click(); clicked = true; break; } catch(e) {}
              }
            }
            if (!clicked) {
              window.scrollBy(0, 5);
              setTimeout(() => window.scrollBy(0, -5), 50);
            }
            document.dispatchEvent(new Event('mousemove'));
            document.dispatchEvent(new Event('scroll'));
            return clicked;
          })()
        """)
        session["lastKeepAlive"] = time.time()
        session["keepAliveCount"] += 1

        # Refresh token too
        auth = get_paytm_cookies(driver)
        if auth and auth["cookieHeader"]:
            refresh_paytm_token(auth["cookieHeader"], auth["xsrfToken"])
        return True
    except Exception as e:
        log(f"Keep-alive failed: {e}", "WARNING")
        return False


# ==========================================
# UNLOCK / LOGIN DETECTION  (mirrors unlockPaytmSession)
# ==========================================
def detect_login_page(driver):
    try:
        tab = find_paytm_tab(driver)
        if tab is None:
            return True
        driver.switch_to.window(tab)
        url = driver.current_url
        body_text = driver.execute_script("return document.body ? document.body.innerText : ''") or ""
        is_login = bool(re.search(r"login|signin|auth|accounts", url, re.I))
        has_password = len(driver.find_elements("css selector", 'input[type="password"]')) > 0
        return is_login or has_password or "sign in" in body_text.lower() or "login" in body_text.lower()
    except Exception:
        return True


def try_unlock(driver):
    try:
        tab = find_paytm_tab(driver)
        if tab is None:
            return False
        driver.switch_to.window(tab)

        # Click unlock / continue / got it buttons
        driver.execute_script("""
          (() => {
            const buttons = document.querySelectorAll('button, [role="button"], [role="button"] a');
            const texts = ['unlock', 'login', 'sign in', 'continue', 'proceed', 'ok', 'got it'];
            for (const btn of buttons) {
              const txt = (btn.innerText || btn.textContent || '').toLowerCase().trim();
              const visible = btn.offsetParent !== null && btn.offsetWidth > 0 && btn.offsetHeight > 0;
              if (visible && texts.some(t => txt.includes(t))) {
                try { btn.click(); return true; } catch(e) {}
              }
            }
            return false;
          })()
        """)

        # Try to navigate back to transactions page
        driver.get(PAYTM_TRANSACTIONS_URL)
        time.sleep(3)
        return not detect_login_page(driver)
    except Exception as e:
        log(f"Unlock attempt error: {e}", "WARNING")
        return False


# ==========================================
# SHOW LOGIN ALERT IN BROWSER
# ==========================================
def show_login_alert(driver):
    try:
        tab = find_paytm_tab(driver)
        if tab is None:
            return
        driver.switch_to.window(tab)
        driver.execute_script("""
          (() => {
            const existing = document.querySelector('.paytm-login-alert');
            if (existing) existing.remove();
            const div = document.createElement('div');
            div.className = 'paytm-login-alert';
            div.style.cssText = `
              position: fixed; top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0,0,0,0.85); z-index: 999999;
              display: flex; align-items: center; justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            `;
            div.innerHTML = `
              <div style="background:white;padding:40px 50px;border-radius:16px;max-width:500px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="font-size:48px;margin-bottom:16px;">🔐</div>
                <h2 style="color:#e74c3c;margin:0 0 12px 0;font-size:24px;">Session Expired</h2>
                <p style="font-size:16px;color:#555;margin:0 0 20px 0;">Please login manually to continue.</p>
                <button onclick="document.querySelector('.paytm-login-alert').remove()"
                  style="background:#3498db;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
                  I'll Login Manually
                </button>
                <button onclick="window.location.reload()"
                  style="background:#95a5a6;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-left:10px;">
                  Refresh Page
                </button>
              </div>
            `;
            document.body.appendChild(div);
          })()
        """)
    except Exception as e:
        log(f"Could not show login alert: {e}", "WARNING")


# ==========================================
# PAYTM API
# ==========================================
def formatted_date(d):
    return d.strftime("%Y-%m-%dT%H:%M:%S+05:30")


def refresh_paytm_token(cookie_header, xsrf_token):
    try:
        r = requests.get(
            "https://dashboard.paytm.com/api/v1/setting/tab/token",
            headers={
                "accept": "application/json",
                "cookie": cookie_header,
                "x-xsrf-token": xsrf_token,
                "user-agent": USER_AGENT,
            },
            timeout=5,
            verify=False,
        )
        if r.status_code in (401, 403):
            return None
        json_data = r.json()
        token = json_data.get("token") or (json_data.get("data") or {}).get("token")
        return token or None
    except Exception:
        return None


def fetch_latest_transactions(cookie_header, xsrf_token):
    now = datetime.now()
    start_of_day = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=0)

    payload = {
        "bizTypeList": ["ACQUIRING", "CASHBACK", "SPLIT_PAYMENT"],
        "pageSize": 10,
        "pageNum": 1,
        "orderCreatedStartTime": formatted_date(start_of_day),
        "orderCreatedEndTime": formatted_date(end_of_day),
        "orderStatusList": ["SUCCESS"],
        "isSort": True,
    }

    try:
        r = requests.post(
            "https://dashboard.paytm.com/api/v3/order/list",
            json=payload,
            headers={
                "accept": "application/json",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json",
                "cookie": cookie_header,
                "origin": "https://dashboard.paytm.com",
                "referer": "https://dashboard.paytm.com/next/transactions",
                "user-agent": USER_AGENT,
                "x-xsrf-token": xsrf_token,
            },
            timeout=10,
            verify=False,
        )

        if r.status_code in (401, 403):
            return "EXPIRED", []

        body = r.text
        if "SESSION_EXPIRED" in body or "BE1400002" in body:
            return "EXPIRED", []

        if r.status_code != 200:
            return "ERROR", []

        data = r.json()
        orders = (
            data.get("orderList")
            or (data.get("body") or {}).get("orderList")
            or (data.get("data") or {}).get("orderList")
            or data.get("orders")
            or []
        )
        return "OK", orders
    except Exception:
        return "ERROR", []


def parse_paytm_order(item):
    if not isinstance(item, dict):
        return None

    order_id = item.get("merchantTransId") or item.get("bizOrderId") or item.get("orderId") or ""
    if not order_id:
        return None

    additional = item.get("additionalInfo") or {}
    raw_val = 0
    if isinstance(item.get("payAmount"), dict) and item["payAmount"].get("value"):
        raw_val = item["payAmount"]["value"]
    elif isinstance(item.get("payMoneyAmount"), dict) and item["payMoneyAmount"]["value"]:
        raw_val = item["payMoneyAmount"]["value"]
    elif additional and isinstance(additional.get("txnAmount"), dict) and additional["txnAmount"].get("value"):
        raw_val = additional["txnAmount"]["value"]
    elif isinstance(item.get("txnAmount"), dict):
        raw_val = item["txnAmount"].get("value") or 0
    elif item.get("txnAmount"):
        raw_val = item["txnAmount"]
    elif isinstance(item.get("amount"), dict):
        raw_val = item["amount"].get("value") or 0
    elif item.get("amount"):
        raw_val = item["amount"]

    num_amt = float(str(raw_val).replace(",", "")) or 0
    if num_amt >= 100 and num_amt % 1 == 0:
        num_amt = num_amt / 100

    comment = (
        (additional.get("comment") or "")
        or item.get("comment")
        or item.get("comments")
        or item.get("remark")
        or item.get("txnNote")
        or item.get("note")
        or ""
    )
    customer_name = additional.get("customerName") or item.get("customerName") or item.get("nickName") or "Customer"
    order_created_time = item.get("orderCreatedTime") or item.get("orderCompletedTime") or datetime.now().isoformat()
    pay_mode = additional.get("payMethod") or item.get("payMethod") or "UPI"

    return {
        "txnId": str(order_id),
        "merchantTransId": str(item.get("merchantTransId") or ""),
        "bizOrderId": str(item.get("bizOrderId") or ""),
        "amount": num_amt if num_amt > 0 else 1.00,
        "comment": str(comment).strip(),
        "orderCreatedTime": str(order_created_time),
        "customerName": str(customer_name),
        "status": str(item.get("orderStatus") or item.get("status") or "SUCCESS"),
        "payMode": str(pay_mode),
    }


def normalize_order_id(raw):
    clean = raw.upper().replace(" ", "")
    if not clean.startswith("ORD-"):
        clean = clean.replace("ORD", "ORD-", 1)
    return clean


# ==========================================
# LISTENER STATUS (mirrors updateListenerStatus)
# ==========================================
def update_status(authenticated=True, message="Session Active"):
    try:
        payload = {
            "heartbeat": True,
            "authenticated": authenticated,
            "message": message,
            "status": "HEALTHY" if authenticated else "SESSION_LOCKED",
            "mongoConnected": False,  # storage not backended to Mongo in this script
            "sessionState": {
                "isLocked": session["isLocked"],
                "isLoggedIn": session["isLoggedIn"],
                "consecutiveFailures": session["consecutiveFailures"],
                "lastSuccessfulFetch": session["lastSuccessfulFetch"],
                "manualInterventionRequired": session["manualInterventionRequired"],
                "loginPageDetected": session["loginPageDetected"],
            },
        }
        requests.post(STATUS_URL, json=payload, timeout=3)
    except Exception:
        pass


# ==========================================
# VERIFY ORDER ON STORE
# ==========================================
def verify_order_on_store(order_id, amount):
    payload = {"orderId": order_id, "amount": amount, "status": "Paid"}
    try:
        r = requests.post(VERIFY_URL, json=payload, timeout=10)
        ok = r.status_code == 200 and r.json().get("success")
        if ok:
            log(f"VERIFIED! Order {order_id} (₹{amount}) marked as PAID on website.", "SUCCESS")
        else:
            log(f"Server response for {order_id}: {r.text}", "WARNING")
        return ok
    except Exception as req_err:
        log(f"API Error connecting to website: {req_err}", "ERROR")
        return False


# ==========================================
# AMOUNT-BASED FALLBACK MATCHING
# PhonePe UPI collect payments often do NOT carry our "Order Payment ORD-123456"
# note back into the Paytm dashboard comment. When the note has no ORDER ID we
# fall back to matching the transaction to a recent unpaid order by amount and
# time, so orders confirm even when the reference text is lost.
# ==========================================
def parse_datetime_flexible(value):
    if value is None:
        return None
    if isinstance(value, (int, float)) or (isinstance(value, str) and value.strip().isdigit()):
        ts = float(value)
        if ts > 10_000_000_000:
            ts = ts / 1000.0
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    s = str(value).strip().replace("Z", "+00:00")
    for fmt in (s, s.split(".")[0]):
        try:
            return datetime.fromisoformat(fmt).astimezone(timezone.utc)
        except Exception:
            continue
    return None


def fetch_pending_orders():
    try:
        r = requests.get(f"{WEBSITE_API_URL}/api/listener/pending", timeout=8)
        if r.status_code == 200:
            return (r.json().get("orders") or [])
    except Exception:
        pass
    return []


def verify_by_amount(amount, txn_time_str):
    pending = fetch_pending_orders()
    if not pending:
        log("Amount-match: no pending orders available", "DEBUG")
        return None

    txn_dt = parse_datetime_flexible(txn_time_str) or datetime.now(timezone.utc)
    candidates = []
    for o in pending:
        try:
            if abs(float(o.get("amount") or 0) - float(amount)) > 0.01:
                continue
        except Exception:
            continue
        created_dt = parse_datetime_flexible(o.get("createdAt"))
        if created_dt and abs((txn_dt - created_dt).total_seconds()) > 45 * 60:
            continue
        candidates.append(o)

    # Prefer the LIVE (non-Failed) order: when the buyer re-opens the UPI app,
    # the previous same-amount order is marked Failed and a fresh one is created.
    # Choosing the active candidate verifies the real 2nd-attempt payment.
    active = [o for o in candidates if str(o.get("status") or "").lower() not in ("failed", "cancelled")]
    if len(active) == 1:
        pick = active[0]
    elif len(candidates) == 1:
        pick = candidates[0]
    else:
        pick = None

    if pick:
        order_id = pick["id"]
        log(f"AMOUNT MATCH: {order_id} (₹{amount}) txn {txn_time_str}", "ACTION")
        verify_order_on_store(order_id, amount)
        return order_id
    if len(candidates) > 1:
        log(f"⚠️ Ambiguous amount ₹{amount} -> {len(candidates)} unpaid orders, skipping auto-verify", "WARNING")
    return None


# ==========================================
# MAIN SCAN  (mirrors fetchPaytmOrdersUsingOpenChrome)
# ==========================================
def scan_paytm_and_verify(driver):
    global processed_txn_ids
    now = time.time()

    # If manual intervention required, only check if user logged back in
    if session["manualInterventionRequired"] or session["loginPageDetected"]:
        log("Manual intervention required - waiting for login in Chrome", "WARNING")
        if now - session["lastLoginCheck"] > 30000:
            session["lastLoginCheck"] = now
            if not detect_login_page(driver):
                log("User has logged in! Resuming...", "SUCCESS")
                session["manualInterventionRequired"] = False
                session["loginPageDetected"] = False
                session["isLoggedIn"] = True
                session["isLocked"] = False
                session["lastKeepAlive"] = now
            else:
                update_status(False, "⚠️ MANUAL LOGIN REQUIRED - Please login to Paytm")
        return

    if session["unlockInProgress"]:
        log("Unlock already in progress, skipping...", "WARNING")
        return

    # Keep-alive if overdue
    if session["lastKeepAlive"] and now - session["lastKeepAlive"] > SESSION_KEEP_ALIVE_INTERVAL:
        log("Session keep-alive needed, performing...", "KEEPALIVE")
        keep_session_alive(driver)

    auth_data = get_paytm_cookies(driver)
    if not auth_data or not auth_data["cookieHeader"]:
        log("No cookies found - session may be locked", "WARNING")
        session["isLocked"] = True
        if now - session["lastUnlockAttempt"] > UNLOCK_COOLDOWN:
            session["unlockInProgress"] = True
            session["lastUnlockAttempt"] = now
            unlocked = try_unlock(driver)
            session["unlockInProgress"] = False
            if unlocked:
                log("Session unlocked, retrying...", "SUCCESS")
                return scan_paytm_and_verify(driver)
            else:
                session["manualInterventionRequired"] = True
                update_status(False, "🔒 SESSION LOCKED - Manual login required")
                show_login_alert(driver)
        return

    token = refresh_paytm_token(auth_data["cookieHeader"], auth_data["xsrfToken"])
    if not token:
        log("Token verification failed - session invalid", "ERROR")
        session["isLocked"] = True
        if now - session["lastUnlockAttempt"] > UNLOCK_COOLDOWN:
            session["unlockInProgress"] = True
            session["lastUnlockAttempt"] = now
            unlocked = try_unlock(driver)
            session["unlockInProgress"] = False
            if unlocked:
                return scan_paytm_and_verify(driver)
            else:
                session["manualInterventionRequired"] = True
                update_status(False, "🔒 SESSION LOCKED - Manual login required")
                show_login_alert(driver)
        return

    # Session is valid
    session["isLocked"] = False
    session["isLoggedIn"] = True
    session["consecutiveFailures"] = 0
    session["manualInterventionRequired"] = False
    session["loginPageDetected"] = False
    session["lastKeepAlive"] = now

    status, orders = fetch_latest_transactions(auth_data["cookieHeader"], auth_data["xsrfToken"])

    if status == "EXPIRED":
        log("Session expired - initiating unlock", "LOCK")
        session["isLocked"] = True
        if now - session["lastUnlockAttempt"] > UNLOCK_COOLDOWN:
            session["unlockInProgress"] = True
            session["lastUnlockAttempt"] = now
            unlocked = try_unlock(driver)
            session["unlockInProgress"] = False
            if unlocked:
                return scan_paytm_and_verify(driver)
        update_status(False, "Session expired - auto-unlock attempted")
        return

    if status == "ERROR":
        log("Error fetching transactions", "ERROR")
        session["consecutiveFailures"] += 1
        if session["consecutiveFailures"] >= session["maxFailures"]:
            log(f"Too many failures ({session['consecutiveFailures']}), marking for manual intervention", "ERROR")
            session["manualInterventionRequired"] = True
            update_status(False, "⚠️ Too many errors - manual intervention required")
        return

    if not orders:
        log("Scanning Paytm... No transactions found.", "INFO")
        session["lastSuccessfulFetch"] = datetime.now().isoformat()
        update_status(True, "Active - 0 new orders")
        return

    log(f"Received {len(orders)} transaction(s) from Paytm API.", "INFO")
    session["lastSuccessfulFetch"] = datetime.now().isoformat()

    for item in orders:
        parsed = parse_paytm_order(item)
        if not parsed:
            continue

        txn_id = parsed["txnId"]
        if txn_id in processed_txn_ids:
            continue

        processed_txn_ids.add(txn_id)
        if len(processed_txn_ids) > MAX_PROCESSED_HISTORY:
            overflow = sorted(processed_txn_ids)[: len(processed_txn_ids) - MAX_PROCESSED_HISTORY]
            for oid in overflow:
                processed_txn_ids.discard(oid)

        match = ORDER_ID_RE.search(parsed["comment"])
        if match:
            order_id = normalize_order_id(match.group(0))
            log(f"FOUND ORDER: {order_id} | ₹{parsed['amount']} | {parsed['customerName']}", "ACTION")
            verify_order_on_store(order_id, parsed["amount"])
            update_status(True, f"Active - synced order {order_id}")
            continue

        # No ORD reference in the note (common for PhonePe UPI collect): try to
        # match the transaction to a recent unpaid order by amount + time.
        matched = verify_by_amount(parsed["amount"], parsed["orderCreatedTime"])
        update_status(True, f"Active - matched order {matched}" if matched else "Active - scanning")

    save_state()


# ==========================================
# PERIODIC TASKS (background threads)
# ==========================================
def periodic_auto_refresh(driver):
    while True:
        time.sleep(AUTO_REFRESH_INTERVAL)
        with scan_lock:
            try:
                if reload_paytm_tab(driver):
                    log("Auto-refresh completed", "REFRESH")
            except Exception as e:
                log(f"Auto-refresh error: {e}", "WARNING")


def periodic_keep_alive(driver):
    while True:
        time.sleep(SESSION_KEEP_ALIVE_INTERVAL)
        with scan_lock:
            try:
                if not session["manualInterventionRequired"] and session["isLoggedIn"]:
                    keep_session_alive(driver)
            except Exception as e:
                log(f"Keep-alive background error: {e}", "WARNING")


def periodic_login_check(driver):
    while True:
        time.sleep(LOGIN_CHECK_INTERVAL)
        with scan_lock:
            try:
                if not session["manualInterventionRequired"]:
                    if detect_login_page(driver):
                        log("Login page detected in background check", "LOGIN")
                        session["manualInterventionRequired"] = True
                        session["loginPageDetected"] = True
                        show_login_alert(driver)
                        update_status(False, "⚠️ LOGIN PAGE - Please login")
            except Exception as e:
                if "closed" not in str(e).lower():
                    log(f"Background login check error: {e}", "WARNING")


# ==========================================
# HEALTH CHECK
# ==========================================
def run_health_check(driver):
    # Token refresh if expiring soon
    if session["tokenExpiryMs"]:
        time_left = session["tokenExpiryMs"] / 1000 - time.time()
        if 0 < time_left < 600:
            log("Token expiring soon, attempting refresh...", "AUTH")
            auth = get_paytm_cookies(driver)
            if auth and auth["cookieHeader"]:
                refresh_paytm_token(auth["cookieHeader"], auth["xsrfToken"])

    # Keep-alive if idle too long
    if session["lastKeepAlive"] and time.time() - session["lastKeepAlive"] > SESSION_IDLE_TIMEOUT:
        log("Session idle for too long, performing keep-alive...", "KEEPALIVE")
        keep_session_alive(driver)

    # Login page detection
    if detect_login_page(driver):
        log("Login page detected during health check", "LOGIN")
        session["manualInterventionRequired"] = True
        session["loginPageDetected"] = True
        show_login_alert(driver)
        update_status(False, "⚠️ LOGIN PAGE - Please login")


# ==========================================
# MAIN
# ==========================================
def main():
    global processed_txn_ids
    load_state()

    print("=" * 60)
    print(" 🚀 PAYTM SCANNER v3.0 (Auto-Fetcher)")
    print(f" 🌐 Target Website: {WEBSITE_API_URL}")
    print(f" 📄 State File: {STATE_FILE}")
    print(f" ⚡ Poll Interval: {POLL_INTERVAL}s")
    print(f" 🔄 Auto-Refresh: Every {AUTO_REFRESH_INTERVAL}s")
    print(f" 💚 Keep-Alive: Every {SESSION_KEEP_ALIVE_INTERVAL}s")
    print("=" * 60)

    driver = None
    while not driver:
        driver = init_chrome_driver()
        if not driver:
            log("Retrying Chrome connection in 5 seconds...", "WARNING")
            time.sleep(5)

    log("Make sure the Paytm dashboard tab is open and logged in.", "INFO")
    log(f"Continuous scanner active (Scanning every {POLL_INTERVAL}s)...", "INFO")

    # Start background threads
    threading.Thread(target=periodic_auto_refresh, args=(driver,), daemon=True).start()
    threading.Thread(target=periodic_keep_alive, args=(driver,), daemon=True).start()
    threading.Thread(target=periodic_login_check, args=(driver,), daemon=True).start()

    while True:
        try:
            with scan_lock:
                scan_paytm_and_verify(driver)
        except Exception as e:
            log(f"Error during scan loop: {e}", "ERROR")
            try:
                driver.current_url
            except Exception:
                log("Chrome connection lost. Reconnecting...", "REFRESH")
                driver = init_chrome_driver()
                if driver:
                    # restart background threads bound to new driver
                    threading.Thread(target=periodic_auto_refresh, args=(driver,), daemon=True).start()
                    threading.Thread(target=periodic_keep_alive, args=(driver,), daemon=True).start()
                    threading.Thread(target=periodic_login_check, args=(driver,), daemon=True).start()

        # Periodic health check (every ~30s)
        if int(time.time()) % 30 == 0:
            try:
                run_health_check(driver)
            except Exception:
                pass

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, QrCode, ShieldCheck, X, Zap, Check, Download
} from 'lucide-react';
import { clearCheckoutDraft } from '../data/checkoutDraft';

type PaymentMethod = 'phonepe' | 'gpay' | 'paytm' | 'bhim' | 'qr_code' | 'credit_card' | 'cod' | 'cashfree';

// Loads the official Cashfree checkout JS SDK on demand so the hosted payment
// page can be opened with just a payment_session_id (no extra npm dependency).
function loadCashfreeSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    const win = window as any;
    if (typeof win.Cashfree === 'function') return resolve(win.Cashfree);
    const s = document.createElement('script');
    s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    s.onload = () => (typeof win.Cashfree === 'function' ? resolve(win.Cashfree) : reject(new Error('Cashfree SDK failed to load')));
    s.onerror = () => reject(new Error('Could not load Cashfree SDK'));
    document.head.appendChild(s);
  });
}

export function CheckoutPayment() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('phonepe');
  const [showQRModal, setShowQRModal] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [openingApp, setOpeningApp] = useState(false);

  // Polling state
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [paymentErrorMsg, setPaymentErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [cashfreeEnabled, setCashfreeEnabled] = useState(false);

  const rawItems = location.state?.items;
  const rawProduct = location.state?.product;
  const address = location.state?.address || {
    name: 'John Doe',
    contact: '9876543210',
    houseNo: '123 Main Street, Apt 4B',
    roadName: 'MG Road',
    city: 'New Delhi',
    stateName: 'Delhi',
    pincode: '110001'
  };

  // ── Normalise order items ───────────────────────────────────────────────────
  const orderItems = useMemo(() => {
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      return rawItems.map((it: any) => {
        const prod = it.product || it;
        const qty = Number(it.quantity) || 1;
        const unitPrice = Number(it.price) || Number(it.resellPrice) || Number(prod.suggestedResellPrice) || Number(prod.wholesalePrice) || 1;
        const origUnitPrice = Number(prod.originalPrice) || Math.round(unitPrice * 1.5);
        return {
          id: it.id || prod.id || `item-${Math.random()}`,
          productId: it.productId || prod.id,
          title: prod.title || 'Product',
          image: prod.image || (Array.isArray(prod.images) ? prod.images[0] : null) || 'https://images.meesho.com/images/products/274719659/4j7z2_512.webp',
          selectedSize: it.selectedSize || prod.sizes?.[0] || 'Standard',
          selectedColor: it.selectedColor || prod.colors?.[0] || 'Default',
          quantity: qty,
          unitPrice,
          origUnitPrice,
          linePrice: unitPrice * qty,
          lineOrigPrice: origUnitPrice * qty,
          product: prod
        };
      });
    }
    if (rawProduct) {
      const qty = Number(rawProduct.quantity) || 1;
      const unitPrice = Number(rawProduct.price) || Number(rawProduct.suggestedResellPrice) || Number(rawProduct.wholesalePrice) || 1;
      const origUnitPrice = Number(rawProduct.originalPrice) || Math.round(unitPrice * 1.5);
      return [{
        id: rawProduct.id || 'single-item',
        productId: rawProduct.id,
        title: rawProduct.title || 'Product Item',
        image: rawProduct.image || (Array.isArray(rawProduct.images) ? rawProduct.images[0] : null) || 'https://images.meesho.com/images/products/274719659/4j7z2_512.webp',
        selectedSize: rawProduct.selectedSize || 'Standard',
        selectedColor: rawProduct.selectedColor || 'Default',
        quantity: qty,
        unitPrice,
        origUnitPrice,
        linePrice: unitPrice * qty,
        lineOrigPrice: origUnitPrice * qty,
        product: rawProduct
      }];
    }
    return [{
      id: 'default', productId: 'default', title: 'Selected Product',
      image: 'https://images.meesho.com/images/products/274719659/4j7z2_512.webp',
      selectedSize: 'Standard', selectedColor: 'Default',
      quantity: 1, unitPrice: 1, origUnitPrice: 99,
      linePrice: 1, lineOrigPrice: 99, product: {}
    }];
  }, [rawItems, rawProduct]);

  const totalQuantity = useMemo(() => {
    if (location.state?.totalQuantity !== undefined) return Number(location.state.totalQuantity);
    return orderItems.reduce((s, i) => s + i.quantity, 0);
  }, [location.state?.totalQuantity, orderItems]);

  const itemsSubtotal = useMemo(() => {
    if (location.state?.subtotal !== undefined) return Number(location.state.subtotal);
    return orderItems.reduce((s, i) => s + i.linePrice, 0);
  }, [location.state?.subtotal, orderItems]);

  const mrpSubtotal = useMemo(() => {
    if (location.state?.itemsOriginalTotal !== undefined) return Number(location.state.itemsOriginalTotal);
    return orderItems.reduce((s, i) => s + i.lineOrigPrice, 0);
  }, [location.state?.itemsOriginalTotal, orderItems]);

  const productDiscount = Math.max(0, mrpSubtotal - itemsSubtotal);

  const volumeDiscount = useMemo(() => {
    if (location.state?.volumeDiscountAmount !== undefined) return Number(location.state.volumeDiscountAmount);
    if (totalQuantity >= 5) return Math.round(itemsSubtotal * 0.20);
    if (totalQuantity === 4) return Math.round(itemsSubtotal * 0.15);
    if (totalQuantity === 3) return Math.round(itemsSubtotal * 0.10);
    if (totalQuantity === 2) return Math.round(itemsSubtotal * 0.05);
    return 0;
  }, [location.state?.volumeDiscountAmount, itemsSubtotal, totalQuantity]);

  const totalAmount = useMemo(() => {
    if (location.state?.totalPrice !== undefined) return Number(location.state.totalPrice);
    return Math.max(1, itemsSubtotal - volumeDiscount);
  }, [location.state?.totalPrice, itemsSubtotal, volumeDiscount]);

  // QR code gets a small extra discount if configured
  const finalAmount = selectedMethod === 'qr_code' ? totalAmount : totalAmount;

  const formatPrice = (p: number) => new Intl.NumberFormat('en-IN').format(p);

  // UPI address is hardcoded here in source so editing it takes effect
  // immediately (the server /api/config no longer overrides it). Update this
  // one line below and rebuild/deploy to change where payments are received.
  const UPI_ADDRESS = 'paytm.s333mbm@pty';
  const NOTE_PREFIX = 'Order Payment';

  // Site name is still loaded dynamically from the server (analytics/tracking)
  const [siteName, setSiteName] = useState('Online Store');

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg?.siteName) setSiteName(cfg.siteName);
        if (cfg?.cashfree) {
          const enabled = Boolean(cfg.cashfree.enabled);
          setCashfreeEnabled(enabled);
          if (enabled) setSelectedMethod('cashfree');
        }
      })
      .catch(() => {});
  }, []);

  const SITE_NAME = siteName || 'Online Store';

  const APP_NAMES: Record<string, string> = {
    phonepe: 'PhonePe', gpay: 'Google Pay', paytm: 'Paytm',
    bhim: 'BHIM UPI', qr_code: 'UPI', credit_card: 'Card', cod: 'Cash', cashfree: 'Cashfree',
  };
  const appName = APP_NAMES[selectedMethod] || 'UPI App';

  const ORDER_ID_KEY = 'meesho_pending_order_id';

  // ── Post-payment redirect: take user back to a DIFFERENT category welcome ──
  const WELCOME_CATEGORIES = [
    { id: 'women-kurti', slug: 'kurti' },
    { id: 'grocery',     slug: 'grocery' },
    { id: 'kitchen',     slug: 'kitchen' },
    { id: 'electronics', slug: 'electronics' },
    { id: 'makeup',      slug: 'makeup' },
  ];

  const getOrderedCategory = (): string => {
    const first = orderItems[0];
    const cat = String(first?.product?.category || first?.category || '').toLowerCase();
    if (/(kurti|ethnic|women|suit)/.test(cat)) return 'women-kurti';
    if (/(grocery|food|staples)/.test(cat)) return 'grocery';
    if (/(kitchen|cookware)/.test(cat)) return 'kitchen';
    if (/(electron|audio|gadget|tech)/.test(cat)) return 'electronics';
    if (/(makeup|beauty|cosmetic|skincare)/.test(cat)) return 'makeup';
    return 'women-kurti';
  };

  const nextCategorySlug = (): string => {
    const ordered = getOrderedCategory();
    const others = WELCOME_CATEGORIES.filter(c => c.id !== ordered);
    if (others.length === 0) return 'kurti';
    const picked = others[Math.floor(Math.random() * others.length)];
    return picked.slug;
  };

  const redirectToDifferentCategory = () => {
    setTimeout(() => navigate(`/welcome/${nextCategorySlug()}`), 2500);
  };

  const [orderId, setOrderId] = useState(() => {
    const saved = sessionStorage.getItem(ORDER_ID_KEY);
    if (saved) return saved;
    const fresh = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    sessionStorage.setItem(ORDER_ID_KEY, fresh);
    return fresh;
  });

  // Generate a brand-new order ID so a fresh reference is sent to Paytm/PhonePe
  // on every new payment attempt (avoids reusing the same ID after a failure).
  const newOrderId = () => {
    const fresh = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    sessionStorage.setItem(ORDER_ID_KEY, fresh);
    return fresh;
  };

  // Build the UPI query string for a *specific* order ID (fresh each call) so
  // the redirect URL always uses the brand-new ID instead of the possibly stale
  // `orderId` state captured in a setTimeout closure.
  const buildQuery = (oid: string) =>
    `pa=${encodeURIComponent(UPI_ADDRESS)}&pn=${encodeURIComponent(SITE_NAME)}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(NOTE_PREFIX + ' ' + oid)}&tr=${encodeURIComponent(oid)}`;

  const upiQuery      = buildQuery(orderId);
  const genericUpiUrl = `upi://pay?${upiQuery}`;
  const qrCodeUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(genericUpiUrl)}&margin=10`;

  // Build the UPI redirect for a *specific* order ID (fresh each call).
  const buildUpiUrl = (oid: string) => `upi://pay?${buildQuery(oid)}`;

  // Build the method-specific deep link that opens the payment screen directly
  // with the amount pre-filled. The two app-specific flows are kept fully
  // separate because each app needs its own scheme/parameters:
//   - PhonePe: `phonepe://native` COLLECT payload (verified working, incl.
//     second-time verification). Same on Android and iOS. UNCHANGED.
//   - Paytm:   restored exactly to the working reference (love.txt) format:
//     `paytmmp://cash_wallet?<upi-query>&featuretype=money_transfer` — opens
//     Paytm's own money-transfer (UPI collect) flow inside the app; this is
//     the approach proven to work. The generic `upi://pay` chooser route (and
//     the `paytmmp://pay` variant) triggers Paytm's "risk policy payment
//     failed" block, so it's only used as a fallback if Paytm is not installed.
//     The query is built from buildQuery() (tn carries the ORD-ID for the
//     scanner), matching the reference exactly.
  const buildMethodUrl = (oid: string, ios: boolean) => {
    const q = buildQuery(oid);
    switch (selectedMethod) {
      case 'paytm':
        return `paytmmp://cash_wallet?${q}&featuretype=money_transfer`;
      case 'phonepe': {
        const amountInPaise = Math.round(Number(finalAmount) * 100);
        const payloadObj = {
          p2pPaymentCheckoutParams: {
            checkoutType: 'COLLECT',
            initialAmount: amountInPaise,
            note: { type: 'text', message: `${NOTE_PREFIX} ${oid}` },
            supportedInstruments: -1
          },
          contact: { type: 'EXTERNAL_MERCHANT', name: SITE_NAME, vpa: UPI_ADDRESS }
        };
        const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj))));
        return `phonepe://native?data=${base64Data}&id=p2ppayment`;
      }
      case 'gpay':
        return ios
          ? `tez://upi/pay?${q}`
          : `upi://pay?${q}`;
      default:
        return buildUpiUrl(oid);
    }
  };

  // Open the UPI app with a "brand-new" order ID so every click sends a fresh
  // order reference to Paytm/PhonePe (used by the "Open UPI App" button on the
  // waiting screen). Any previous still-pending payment is first marked as
  // failed so retries always start with a completely new order reference.
  const openUpiApp = async () => {
    setOpeningApp(true);
    if (pollingOrderId) {
      try {
        await fetch('/api/orders/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: pollingOrderId, amount: 0, status: 'Failed' })
        });
      } catch {}
    }
    const freshId = newOrderId();
    setOrderId(freshId);
    setPollingOrderId(freshId);
    setPaymentStatus('pending');
    setTimeLeft(300);
    try { await saveOrder(freshId); } catch {}
    sessionStorage.setItem('meesho_pending_polling', '1');
    // Retry must use the SAME kind of deep link as the first attempt so the
    // flow behaves identically (PhonePe intent URL, Paytm cash_wallet, etc.).
    const isIOSRetry = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const url = buildMethodUrl(freshId, isIOSRetry);
    window.location.href = url;
    setTimeout(() => {
      if (document.visibilityState === 'visible') window.location.href = url;
    }, 1500);
    // If the browser stays on this page (in-app browsers), drop back to the
    // waiting message once the app has had time to open.
    setTimeout(() => setOpeningApp(false), 2500);
  };

  // ── Meta/GA Tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'InitiateCheckout', {
        value: finalAmount, currency: 'INR', num_items: totalQuantity,
        content_ids: orderItems.map(i => i.productId)
      });
    }
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'begin_checkout', {
        value: finalAmount, currency: 'INR',
        items: orderItems.map(i => ({ item_id: i.productId, item_name: i.title, quantity: i.quantity, price: i.unitPrice }))
      });
    }
  }, []);

  // ── Polling timer countdown ────────────────────────────────────────────────
  useEffect(() => {
    let t: any;
    if (pollingOrderId && paymentStatus === 'pending' && timeLeft > 0) {
      t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && paymentStatus === 'pending') {
      // No failure popup: mark the previous order as failed (so a retry can use
      // a fresh order ID) and keep waiting for the payment verification by
      // resetting the countdown instead of showing "Payment Not Received".
      fetch('/api/orders/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: pollingOrderId, amount: 0, status: 'Failed' })
      }).catch(() => {});
      setTimeLeft(300);
    }
    return () => clearInterval(t);
  }, [pollingOrderId, paymentStatus, timeLeft]);

  // ── Poll server for payment confirmation ───────────────────────────────────
  const checkPaymentStatus = async () => {
    if (!pollingOrderId || paymentStatus !== 'pending') return;
    try {
      const res = await fetch(`/api/orders/${pollingOrderId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'Paid') {
        setShowQRModal(false);
        setPaymentStatus('success');
        clearCheckoutDraft();
        sessionStorage.removeItem(ORDER_ID_KEY);
        sessionStorage.removeItem('meesho_pending_polling');
        if (typeof (window as any).fbq === 'function') {
          (window as any).fbq('track', 'Purchase', {
            value: finalAmount, currency: 'INR', content_type: 'product',
            content_ids: orderItems.map(i => i.productId), num_items: totalQuantity
          });
        }
        redirectToDifferentCategory();
      } else if (data.status === 'Failed') {
        if (data.paymentFailed === true) {
          // A genuine gateway/webhook-confirmed failure (Cashfree, Paytm
          // scanner) — stop and let the customer retry or cancel.
          setPaymentErrorMsg(data.paymentError || 'Your payment did not complete.');
          setPaymentStatus('failed');
        }
        // Otherwise a temporary pending-state marker: keep waiting.
        return;
      }
    } catch {}
  };

  useEffect(() => {
    let interval: any;
    if (pollingOrderId && paymentStatus === 'pending') {
      interval = setInterval(() => { if (!document.hidden) checkPaymentStatus(); }, 2500);
    }
    return () => clearInterval(interval);
  }, [pollingOrderId, paymentStatus]);

  useEffect(() => {
    const onVisible = () => { if (!document.hidden && pollingOrderId && paymentStatus === 'pending') checkPaymentStatus(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [pollingOrderId, paymentStatus]);

  // ── Fire GA4 purchase event when the success popup opens ──────────────────
  const purchaseFiredRef = React.useRef(false);
  useEffect(() => {
    if (paymentStatus !== 'success' || purchaseFiredRef.current) return;
    purchaseFiredRef.current = true;
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'purchase', {
        value: finalAmount,
        currency: 'INR',
        transaction_id: pollingOrderId || orderId,
        num_items: totalQuantity,
        items: orderItems.map(i => ({ item_id: i.productId, item_name: i.title, quantity: i.quantity, price: i.unitPrice }))
      });
    }
  }, [paymentStatus]);

  // ── Restore polling after returning from a UPI app deep-link ─────────────
  const restoredRef = React.useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const q = new URLSearchParams(location.search);
    const returnedId = q.get('order_id');
    const resumeKey = 'meesho_pending_polling';
    const wasRedirecting = sessionStorage.getItem(resumeKey) === '1';
    sessionStorage.removeItem(resumeKey);
    sessionStorage.removeItem('meesho_cashfree_session');
    sessionStorage.removeItem('meesho_cashfree_env');
    if (wasRedirecting) {
      // Also matches the Cashfree return_url (?order_id=...) flow — the id is
      // already in sessionStorage (newOrderId) so polling resumes immediately.
      setPollingOrderId(returnedId || orderId);
      setPaymentStatus('pending');
    } else if (returnedId) {
      setOrderId(returnedId);
      setPollingOrderId(returnedId);
      setPaymentStatus('pending');
      setTimeLeft(300);
    }
  }, [orderId]);

  // ── Save order to server ───────────────────────────────────────────────────
  const saveOrder = async (oid: string, method: string = 'UPI') => {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: oid,
        items: orderItems.map(it => ({
          productId: it.productId, product: it.product, quantity: it.quantity,
          selectedSize: it.selectedSize, selectedColor: it.selectedColor,
          resellPrice: it.unitPrice, price: it.unitPrice
        })),
        customerName: address.name,
        customerPhone: address.contact,
        customerAddress: `${address.houseNo}, ${address.roadName}, ${address.city}, ${address.stateName} - ${address.pincode}`,
        city: address.city, pincode: address.pincode,
        totalWholesaleAmount: finalAmount, totalResellAmount: finalAmount,
        totalMarginEarned: 0, paymentMethod: method, status: 'Pending'
      })
    });
  };

  // ── QR UTR submit ──────────────────────────────────────────────────────────
  const handleUTRSubmit = async () => {
    if (utrNumber.length < 12) {
      alert('Please enter a valid 12-digit UTR / transaction number');
      return;
    }
    try { await saveOrder(orderId); } catch {}
    // Instantly mark as paid since user confirmed manually
    await fetch('/api/orders/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount: finalAmount, status: 'Paid' })
    }).catch(() => {});
    // Fire the Meta purchase pixel exactly like the auto-detected path does.
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'Purchase', {
        value: finalAmount, currency: 'INR', content_type: 'product',
        content_ids: orderItems.map(i => i.productId), num_items: totalQuantity
      });
    }
    setShowQRModal(false);
    setPollingOrderId(orderId);
    setPaymentStatus('success');
    clearCheckoutDraft();
    sessionStorage.removeItem(ORDER_ID_KEY);
    sessionStorage.removeItem('meesho_pending_polling');
    redirectToDifferentCategory();
  };

  // ── Main payment initiator ─────────────────────────────────────────────────
  const initiatePayment = async () => {
    // Retire any previous polling order so the scanner always sees exactly one
    // active (Pending) order per amount — otherwise a second payment attempt
    // would look ambiguous and never confirm. (Same as openUpiApp does.)
    if (pollingOrderId) {
      try {
        await fetch('/api/orders/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: pollingOrderId, amount: 0, status: 'Failed' })
        });
      } catch {}
    }
    // Always use a brand-new order ID for a fresh payment attempt so a failed
    // payment never reuses the same ID with Paytm/PhonePe.
    const freshId = newOrderId();
    setOrderId(freshId);

    if (selectedMethod === 'qr_code') {
      try { await saveOrder(freshId); } catch {}
      setPollingOrderId(freshId);
      setPaymentStatus('pending');
      setTimeLeft(300);
      setShowQRModal(true);
      return;
    }
    if (selectedMethod === 'credit_card' || selectedMethod === 'cod') return;

    // ── Cashfree: online payment gateway (cards / UPI / net banking / wallets) ──
    if (selectedMethod === 'cashfree') {
      try { await saveOrder(freshId, 'Cashfree'); } catch {}
      setPollingOrderId(freshId);
      setPaymentStatus('pending');
      setTimeLeft(300);
      setIsRedirecting(true);
      sessionStorage.setItem('meesho_pending_polling', '1');
      sessionStorage.setItem('meesho_cashfree_session', '1');
      try {
        const res = await fetch('/api/payments/cashfree/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: freshId,
            amount: finalAmount,
            customer: { name: address.name, phone: address.contact, email: address.email || '' },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.paymentSessionId) {
          throw new Error(data.error || 'Cashfree could not start this order');
        }
        const mode = data.environment === 'sandbox' ? 'sandbox' : 'production';
        sessionStorage.setItem('meesho_cashfree_env', mode);
        const CashfreeCtor = await loadCashfreeSdk();
        const cashfree = new CashfreeCtor({ mode });
        cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: '_self',
        });
        setTimeout(() => setIsRedirecting(false), 2000);
      } catch (err: any) {
        setIsRedirecting(false);
        setPaymentStatus(null);
        sessionStorage.removeItem('meesho_cashfree_session');
        alert('Cashfree payment could not be started. Please try another payment method.');
      }
      return;
    }

    setIsRedirecting(true);
    try { await saveOrder(freshId); } catch {}
    sessionStorage.setItem('meesho_pending_polling', '1');
    setPollingOrderId(freshId);
    setPaymentStatus('pending');
    setTimeLeft(300);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Build the query once against the brand-new order ID so every payment
    // attempt sends a fresh tn/tr reference (never a reused/stale ID).
    const freshQuery = buildQuery(freshId);
    const freshGenericUrl = `upi://pay?${freshQuery}`;

    setTimeout(() => {
      setIsRedirecting(false);
      // Primary deep link opens the payment screen of the chosen app directly
      // with the amount pre-filled. Fall back to the universal `upi://pay` URL.
      const redirectUrl = buildMethodUrl(freshId, isIOS);
      const fallbackUrl  = freshGenericUrl;

      window.location.href = redirectUrl;

      // Level 2 fallback after 1.5 s if still on page
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.href = fallbackUrl;
          // Level 3: plain upi:// for iOS PhonePe/GPay
          if (isIOS && (selectedMethod === 'phonepe' || selectedMethod === 'gpay')) {
            setTimeout(() => {
              if (document.visibilityState === 'visible') {
                window.location.href = freshGenericUrl;
              }
            }, 1500);
          }
        }
      }, 1500);
    }, 800);
  };

  // ── Download QR code as PNG ────────────────────────────────────────────────
  const handleDownloadQR = async () => {
    try {
      const res = await fetch(qrCodeUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 520;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 520);
        ctx.drawImage(img, 90, 80, 220, 220);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`Order ${orderId}`, 200, 50);
        ctx.fillStyle = '#038d63';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(`₹${finalAmount}`, 200, 350);
        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.fillText('PhonePe • Paytm • Any UPI', 200, 385);
        ctx.fillText('🔒 100% Secure Payment', 200, 410);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `QR_${orderId}.png`;
        a.click();
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    } catch { window.open(qrCodeUrl, '_blank'); }
  };

  // ── Payment methods definition ─────────────────────────────────────────────
  const upiMethods = [
    { id: 'phonepe',  name: 'PhonePe',      desc: 'Pay seamlessly via PhonePe', icon: 'https://img.icons8.com/color/96/phone-pe.png',                                      fast: true  },
    { id: 'paytm',    name: 'Paytm UPI',    desc: 'Flat ₹30 Cashback applied',  icon: 'https://img.icons8.com/color/96/paytm.png',                                         cashback: true },
    { id: 'qr_code',  name: 'Scan QR Code', desc: 'Scan with any UPI app',      lucide: <QrCode className="w-5 h-5" /> },
  ];

  const onlineMethods = [
    { id: 'cashfree', name: 'Card / Net Banking by Cashfree', desc: 'Debit & credit cards, net banking, wallets — Indian PG', icon: 'https://img.icons8.com/color/96/credit-card.png', secure: true, lucide: undefined },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#f0f2f5] flex flex-col font-sans select-none overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white px-4 h-[60px] flex items-center shadow-sm sticky top-0 z-40 shrink-0">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center mr-3 active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5 text-[#02060ce6]" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-[16px] font-extrabold text-[#02060ce6] tracking-tight leading-none mb-1">
            Payment Options
          </h1>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
            {totalQuantity} item{totalQuantity !== 1 ? 's' : ''} • To Pay: ₹{formatPrice(finalAmount)}
          </span>
        </div>
      </header>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4">

        {/* Free delivery banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="bg-gradient-to-r from-[#fdf2f9] to-[#f8eef8] rounded-2xl p-3 mb-5 flex items-center gap-3 border border-[#f3d4ed] shadow-sm">
          <img src="https://png.pngtree.com/png-clipart/20230211/original/pngtree-free-delivery-truck-icon-png-image_8951758.png"
            className="h-5 drop-shadow-sm" alt="Free delivery" />
          <div>
            <p className="text-[13px] font-extrabold text-[#02060ce6] leading-tight">Free delivery applied!</p>
            <p className="text-[11px] text-[#9f2089] font-bold mt-0.5">You saved ₹40 on this order</p>
          </div>
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
          className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-extrabold text-[#02060ce6]">
              Order Summary ({totalQuantity} item{totalQuantity !== 1 ? 's' : ''})
            </span>
            <span className="text-[14px] font-black text-[#02060ce6]">₹{formatPrice(finalAmount)}</span>
          </div>
          <div className="space-y-3">
            {orderItems.map((item, idx) => (
              <div key={item.id || idx} className="flex items-center gap-3">
                <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center p-0.5">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="max-h-full max-w-full object-contain mix-blend-multiply" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[12.5px] font-bold text-[#02060ce6] line-clamp-1">{item.title}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">Size: {item.selectedSize}</span>
                    {item.selectedColor && item.selectedColor.toLowerCase() !== 'default' && (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">Color: {item.selectedColor}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10.5px] font-extrabold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                      Qty {item.quantity}
                    </span>
                    <span className="text-[11px] text-gray-400">(₹{formatPrice(item.unitPrice)}/pc)</span>
                    {item.origUnitPrice > item.unitPrice && (
                      <>
                        <span className="text-[10.5px] text-gray-400 line-through">MRP ₹{formatPrice(item.origUnitPrice)}</span>
                        <span className="text-[10.5px] text-[#208447] font-bold">
                          {Math.round(((item.origUnitPrice - item.unitPrice) / item.origUnitPrice) * 100)}% off
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[13px] font-black text-[#02060ce6]">₹{formatPrice(item.unitPrice * item.quantity)}</span>
                  {item.origUnitPrice > item.unitPrice && (
                    <span className="text-[10px] text-gray-400 line-through">₹{formatPrice(item.origUnitPrice * item.quantity)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* UPI Methods */}
        <motion.h2
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="text-[13px] font-black text-gray-500 uppercase tracking-wider mb-3">
          Recommended UPI Options
        </motion.h2>

        <div className="space-y-3">
          {upiMethods.map((method, idx) => {
            const isActive = selectedMethod === method.id;
            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + idx * 0.05 }}
                onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                className={`bg-white border-[1.5px] rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-200
                  ${isActive ? 'border-[#9f2089] bg-[#fdf2f9] shadow-[0_4px_15px_rgba(159,32,137,0.1)]' : 'border-gray-200 hover:border-gray-300'}`}>

                {/* Icon */}
                <div className={`w-10 h-10 flex items-center justify-center border border-gray-100 rounded-xl
                  ${method.id === 'qr_code' ? 'bg-[#fdf2f9] text-[#9f2089]' : 'bg-gray-50'}`}>
                  {method.icon     && <img src={method.icon} className="w-full h-full object-contain p-1" alt={method.name} />}
                  {method.lucide}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-extrabold text-[#02060ce6] leading-tight flex items-center gap-2 flex-wrap">
                    {method.name}
                    {method.fast && (
                      <span className="text-[10px] font-extrabold text-[#1ba672] bg-[#dcfce7] px-1.5 py-0.5 rounded-md border border-[#bbf7d0] flex items-center gap-0.5">
                        <Zap className="w-3 h-3 fill-current" /> Fast
                      </span>
                    )}
                    {method.cashback && (
                      <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-200">
                        Cashback
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] font-bold text-gray-500 mt-0.5">{method.desc}</p>
                </div>

                {/* Radio */}
                <div className={`w-[22px] h-[22px] border-2 rounded-full flex items-center justify-center transition-all shrink-0
                  ${isActive ? 'border-[#9f2089]' : 'border-gray-300'}`}>
                  <div className={`w-2.5 h-2.5 bg-[#9f2089] rounded-full transition-transform duration-200
                    ${isActive ? 'scale-100' : 'scale-0'}`} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Card / Online Payments via Cashfree */}
        {cashfreeEnabled && (
          <>
            <motion.h2
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-[13px] font-black text-gray-500 uppercase tracking-wider mb-3 mt-6">
              Card / Online Payments
            </motion.h2>

            <div className="space-y-3">
              {onlineMethods.map((method, idx) => {
                const isActive = selectedMethod === method.id;
                return (
                  <motion.div
                    key={method.id}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35 + idx * 0.05 }}
                    onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                    className={`bg-white border-[1.5px] rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-200
                      ${isActive ? 'border-[#9f2089] bg-[#fdf2f9] shadow-[0_4px_15px_rgba(159,32,137,0.1)]' : 'border-gray-200 hover:border-gray-300'}`}>

                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center border border-gray-100 rounded-xl bg-gray-50">
                      {method.icon && <img src={method.icon} className="w-full h-full object-contain p-1" alt={method.name} />}
                      {method.lucide}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-extrabold text-[#02060ce6] leading-tight flex items-center gap-2 flex-wrap">
                        {method.name}
                        {method.secure && (
                          <span className="text-[10px] font-extrabold text-[#1ba672] bg-[#dcfce7] px-1.5 py-0.5 rounded-md border border-[#bbf7d0] flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" /> Secure
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] font-bold text-gray-500 mt-0.5">{method.desc}</p>
                    </div>

                    {/* Radio */}
                    <div className={`w-[22px] h-[22px] border-2 rounded-full flex items-center justify-center transition-all shrink-0
                      ${isActive ? 'border-[#9f2089]' : 'border-gray-300'}`}>
                      <div className={`w-2.5 h-2.5 bg-[#9f2089] rounded-full transition-transform duration-200
                        ${isActive ? 'scale-100' : 'scale-0'}`} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] mb-5 mt-6 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-extrabold text-[#02060ce6]">Price Details</span>
              <span className="text-[11px] font-bold text-gray-400">({totalQuantity} item{totalQuantity !== 1 ? 's' : ''})</span>
            </div>
          </div>
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 bg-gray-50/40 space-y-2 text-[13px]">
            {mrpSubtotal > 0 && (
              <div className="flex justify-between text-gray-600"><span>Items subtotal (MRP)</span><span>₹{formatPrice(mrpSubtotal)}</span></div>
            )}
            {productDiscount > 0 && (
              <div className="flex justify-between text-[#038d63] font-bold"><span>Discount on products</span><span>-₹{formatPrice(productDiscount)}</span></div>
            )}
            {volumeDiscount > 0 && (
              <div className="flex justify-between text-[#038d63] font-bold"><span>Volume discount</span><span>-₹{formatPrice(volumeDiscount)}</span></div>
            )}
            <div className="flex justify-between text-[#038d63] font-bold"><span>Delivery</span><span>FREE</span></div>
            <div className="flex justify-between font-black text-[#02060ce6] border-t border-gray-200 pt-2">
              <span>Total</span><span>₹{formatPrice(finalAmount)}</span>
            </div>
          </div>
        </motion.div>

        {/* Other (disabled) options */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 text-gray-400 font-bold text-[12px] pb-4">
          <ShieldCheck className="w-4 h-4 text-[#1ba672]" /> 100% Secure &amp; Encrypted Payments
        </motion.div>
      </main>

      {/* ── Sticky CTA ──────────────────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md p-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.06)] z-40 shrink-0">
        <button
          onClick={initiatePayment}
          className="w-full bg-[#9f2089] text-white font-extrabold text-[17px] h-[52px] rounded-2xl shadow-[0_8px_20px_rgba(159,32,137,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-[#831871]">
          Pay securely ₹{formatPrice(finalAmount)}
        </button>
      </div>

      {/* ── Redirecting toast ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isRedirecting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-[#02060ce6]/95 backdrop-blur-sm text-white px-6 py-3.5 rounded-full text-[13.5px] font-bold shadow-xl z-[100] flex items-center gap-2.5 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 text-[#1ba672]" /> Redirecting to Gateway...
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Payment success / failed overlay (non-QR methods) ──────────────── */}
      <AnimatePresence>
        {pollingOrderId && !showQRModal && paymentStatus !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-[340px] rounded-[24px] p-6 relative text-center shadow-2xl">

              {paymentStatus === 'success' ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600 stroke-[3]" />
                  </div>
                  <h3 className="text-[20px] font-extrabold text-[#02060ce6] mb-1">Payment Successful!</h3>
                  <p className="text-[13px] font-bold text-gray-500">Order {pollingOrderId} confirmed. Redirecting…</p>
                </>
              ) : paymentStatus === 'failed' ? (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-red-600 stroke-[3]" />
                  </div>
                  <h3 className="text-[20px] font-extrabold text-[#02060ce6] mb-1">Payment Failed</h3>
                  <p className="text-[13px] font-bold text-gray-500">
                    {paymentErrorMsg || 'Your payment did not complete.'}
                  </p>
                  <button
                    onClick={() => { setPaymentErrorMsg(''); setPaymentStatus('pending'); setTimeLeft(300); initiatePayment(); }}
                    className="mt-3 w-full bg-[#9f2089] text-white font-extrabold text-[14px] py-3 rounded-xl hover:bg-[#831871] transition-colors">
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setPollingOrderId(null); setPaymentStatus(null); setPaymentErrorMsg('');
                      sessionStorage.removeItem(ORDER_ID_KEY);
                      sessionStorage.removeItem('meesho_pending_polling');
                    }}
                    className="mt-2 text-[13px] text-gray-500 font-semibold">Cancel</button>
                </>
              ) : (
    <>
      <div className="w-12 h-12 border-[3px] border-[#9f2089]/20 border-t-[#9f2089] rounded-full animate-spin mx-auto mb-4" />
      <h3 className="text-[16px] font-bold text-[#02060ce6]">
        {openingApp ? 'Opening UPI App…' : 'Waiting for Payment…'}
      </h3>
      <p className="text-[12px] text-gray-500 mt-1">
        {openingApp ? (
          <>
            Opening <span className="font-bold text-[#9f2089]">{appName}</span> with ₹{finalAmount} pre-filled.<br />
            <span>Return here after paying — we'll verify automatically.</span>
          </>
        ) : (
          <>
            Complete ₹{finalAmount} in your UPI app.<br />
            <span className="font-bold text-[#9f2089]">We'll verify your payment once it's done.</span>
          </>
        )}
      </p>
      <button onClick={openUpiApp} disabled={openingApp}
        className="mt-3 w-full bg-[#9f2089] text-white font-extrabold text-[14px] py-3 rounded-xl hover:bg-[#831871] transition-colors disabled:opacity-60 disabled:cursor-wait">
        {openingApp ? 'Opening UPI App…' : 'Open UPI App'}
      </button>
      <button onClick={() => {
        setPollingOrderId(null); setPaymentStatus(null);
        sessionStorage.removeItem(ORDER_ID_KEY);
        sessionStorage.removeItem('meesho_pending_polling');
      }}
        className="mt-2 text-[13px] text-gray-500 font-semibold">Cancel</button>
    </>
  )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QR Modal ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#02060ce6]/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQRModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-[340px] rounded-[24px] p-6 relative text-center shadow-2xl"
              onClick={e => e.stopPropagation()}>

              <button onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-[18px] font-extrabold text-[#02060ce6] mb-1">Scan QR with any UPI App</h3>
              <p className="text-[12px] font-bold text-gray-500 mb-4">
                Order <span className="text-[#9f2089]">{orderId}</span> • Expires in{' '}
                <span className="text-red-500 font-bold">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </p>

              <div className="bg-white p-3 border-[1.5px] border-gray-200 rounded-2xl inline-block mb-3">
                <img src={qrCodeUrl} className="w-[180px] h-[180px] object-contain" alt="QR Code" />
              </div>

              <div className="text-[24px] font-black text-[#9f2089] mb-1">₹{formatPrice(finalAmount)}</div>
              <p className="text-[11px] text-gray-400 font-bold mb-4">UPI: {UPI_ADDRESS}</p>

              <button onClick={handleDownloadQR}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700 mx-auto mb-4 transition-colors">
                <Download className="w-3.5 h-3.5" /> Save QR Image
              </button>

              {/* UTR confirmation */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-left mb-4">
                <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Enter 12-Digit UTR / Transaction No.
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="e.g. 312019283745"
                  className="w-full bg-white px-3 py-2.5 rounded-lg border border-gray-200 font-bold text-[#02060ce6] text-[15px] outline-none focus:border-[#9f2089] transition-colors"
                />
              </div>

              <button
                onClick={handleUTRSubmit}
                className="w-full bg-[#02060ce6] text-white font-extrabold text-[15px] py-3.5 rounded-xl active:scale-95 transition-transform">
                Confirm Payment ✓
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

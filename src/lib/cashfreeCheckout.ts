// Single source of truth for starting a Cashfree checkout.
//
// Makes the storefront behave exactly like the PHP version: the Cashfree order
// is created WHILE the customer is still on the summary/cart page (one server
// request) and the browser then jumps straight to Cashfree — no intermediate
// "Connecting to Cashfree…" screen that looks like buffering.

const ORDER_ID_KEY = 'meesho_pending_order_id';
const CASHFREE_ORDER_ID_KEY = 'meesho_cashfree_order_id';

export function genCheckoutOrderId(): string {
  const fresh = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  try {
    sessionStorage.setItem(ORDER_ID_KEY, fresh);
  } catch {}
  return fresh;
}

const DEFAULT_ADDRESS = {
  name: 'John Doe',
  contact: '9876543210',
  houseNo: '123 Main Street, Apt 4B',
  roadName: 'MG Road',
  city: 'New Delhi',
  stateName: 'Delhi',
  pincode: '110001'
};

export interface CashfreeStartState {
  orderId?: string;
  amount?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items?: any[];
  product?: any;
  address?: any;
  totalPrice?: number;
}

// Build the exact POST body the server expects for /api/payments/cashfree/create
// (single-call flow: the server persists the order AND creates the Cashfree
// order in the same request). Mirrors the payload the payment page used to send
// so the stored order is identical no matter which entry point started it.
export function buildCashfreePayload(state: CashfreeStartState, orderId: string) {
  const address = state.address && typeof state.address === 'object'
    ? { ...DEFAULT_ADDRESS, ...state.address }
    : { ...DEFAULT_ADDRESS };
  const rawItems = Array.isArray(state.items) && state.items.length > 0
    ? state.items
    : state.product ? [state.product] : [];
  const items = rawItems.map((it: any) => {
    const prod = it.product || it;
    const unitPrice = Number(it.price) || Number(it.resellPrice) || Number(prod.suggestedResellPrice) || Number(prod.wholesalePrice) || 1;
    return {
      productId: it.productId || prod.id,
      product: prod,
      quantity: Number(it.quantity) || 1,
      selectedSize: it.selectedSize || prod.sizes?.[0] || 'Standard',
      selectedColor: it.selectedColor || prod.colors?.[0] || 'Default',
      resellPrice: unitPrice,
      price: unitPrice
    };
  });

  const amount = Number(state.amount) || Number(state.totalPrice) || Math.max(1, items.reduce((s: number, it: any) => s + it.resellPrice * it.quantity, 0));
  const customerName = address.name || state.customerName || DEFAULT_ADDRESS.name;
  const customerPhone = address.contact || state.customerPhone || DEFAULT_ADDRESS.contact;

  return {
    orderId,
    amount,
    customer: { name: customerName, phone: customerPhone, email: address.email || state.customerEmail || '' },
    order: {
      id: orderId,
      items,
      customerName,
      customerPhone,
      customerAddress: `${address.houseNo}, ${address.roadName}, ${address.city}, ${address.stateName} - ${address.pincode}`,
      city: address.city,
      pincode: address.pincode,
      totalWholesaleAmount: amount,
      totalResellAmount: amount,
      totalMarginEarned: 0,
      paymentMethod: 'Cashfree',
      status: 'Pending'
    }
  };
}

// Create the Cashfree order and redirect the whole browser to the hosted
// payment page. Resolves TRUE when the redirect was triggered. Rejects when the
// checkout cannot start (keys missing, domain not whitelisted, etc.) so the
// caller can fall back to the in-app payment page.
export async function startCashfreeCheckout(state: CashfreeStartState): Promise<boolean> {
  const orderId = state.orderId || genCheckoutOrderId();
  const res = await fetch('/api/payments/cashfree/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildCashfreePayload(state, orderId))
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.paymentSessionId) {
    throw new Error(data.error || 'Cashfree could not start this order');
  }
  const mode = data.environment === 'sandbox' ? 'sandbox' : 'production';
  try {
    sessionStorage.setItem(ORDER_ID_KEY, orderId);
    sessionStorage.setItem(CASHFREE_ORDER_ID_KEY, orderId);
    sessionStorage.setItem('meesho_pending_polling', '1');
    sessionStorage.setItem('meesho_cashfree_session', '1');
    sessionStorage.setItem('meesho_cashfree_env', mode);
  } catch {}
  if (!data.paymentLink) {
    throw new Error('Cashfree did not return a payment link');
  }
  window.location.href = data.paymentLink;
  return true;
}

// Guard against double-taps: while a Cashfree redirect is in flight, any extra
// taps reuse the same request instead of creating a second Cashfree order for
// the same customer.
let inflightStart: Promise<boolean> | null = null;

export function openCashfreeCheckout(state: CashfreeStartState): Promise<boolean> {
  if (inflightStart) return inflightStart;
  inflightStart = startCashfreeCheckout(state).finally(() => { inflightStart = null; });
  return inflightStart;
}
import React, { useEffect, useState, useCallback } from 'react';
import { getOrders, updateOrderStatus, getToken } from './adminApi';
import { AdminOrder } from './adminTypes';
import { DateRangeFilter, DateRange } from './DateRangeFilter';
import { saveToCache, loadFromCache } from './adminCache';
import {
  Loader, ChevronDown, Package, IndianRupee, Phone, MapPin, RefreshCw, CheckCircle2,
} from 'lucide-react';

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Paid', 'Failed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

const statusColor: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-blue-100 text-blue-700',
  Paid: 'bg-emerald-100 text-emerald-700',
  Failed: 'bg-red-100 text-red-700',
  Shipped: 'bg-indigo-100 text-indigo-700',
  'Out for Delivery': 'bg-purple-100 text-purple-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>(() => loadFromCache<AdminOrder[]>('orders') || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [live, setLive] = useState(false);
  const [range, setRange] = useState<DateRange>({});

  const load = useCallback(() => {
    return getOrders(range)
      .then((d) => {
        setOrders(d.orders);
        saveToCache('orders', d.orders);
        setLastUpdated(new Date().toLocaleTimeString());
        return d;
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [load]);

  // Realtime updates via Server-Sent Events: new orders arrive instantly and
  // changes apply to just the affected order — no full-list reload or flicker.
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      fetch('/api/admin/orders/stream', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok || !res.body) throw new Error('stream failed');
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          const pump = () =>
            reader.read().then(({ done, value }) => {
              if (done) {
                throw new Error('closed');
              }
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() || '';
              for (const part of parts) {
                const line = part.split('\n').find((l) => l.startsWith('data:'));
                if (!line) continue;
                const payload = JSON.parse(line.slice(5).trim());
                handleEvent(payload);
              }
              return pump();
            })
            .catch((err) => {
              // Auto-reconnect with a short delay (unless unmounted).
              if (!controller.signal.aborted) {
                setLive(false);
                retryTimer = setTimeout(connect, 3000);
              }
            });
          setLive(true);
          pump();
        })
        .catch(() => {});
    };

    const handleEvent = (payload: any) => {
      if (!payload || !payload.type) return;
      if (payload.type === 'refresh' || payload.type === 'connected') {
        load();
        return;
      }
      // When a date filter is active, always re-fetch so the list stays
      // correctly scoped to the selected range.
      const hasRange = !!(range.from || range.to);
      if (payload.type === 'created') {
        if (hasRange) { load(); return; }
        const o = payload.order;
        setOrders((prev) => {
          const next = prev.some((x) => x.id === o.id)
            ? prev.map((x) => (x.id === o.id ? { ...x, ...o } : x))
            : [o, ...prev];
          saveToCache('orders', next);
          return next;
        });
        setLastUpdated(new Date().toLocaleTimeString());
        return;
      }
      if (payload.type === 'updated') {
        if (hasRange) { load(); return; }
        const o = payload.order;
        setOrders((prev) => {
          const next = prev.map((x) => (x.id === o.id ? { ...x, ...o } : x));
          saveToCache('orders', next);
          return next;
        });
        setLastUpdated(new Date().toLocaleTimeString());
        return;
      }
    };

    connect();
    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
      setLive(false);
    };
  }, [load]);

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatus(id, status);
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === id ? { ...o, status } : o));
        saveToCache('orders', next);
        return next;
      });
    } catch (e: any) {
      setError(e.message);
    }
  };

  // timeAgo uses `now`
  const timeAgo = (t?: string) => {
    if (!t) return '';
    const diff = now - new Date(t).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(t).toLocaleDateString();
  };

  const productImage = (item: any) => {
    return item?.product?.image || item?.product?.images?.[0] || '';
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-extrabold text-gray-800">Orders</h2>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            {live ? 'Live — updates in real time' : 'Reconnecting…'} · Last update: {lastUpdated || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-2 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <Package className="w-14 h-14 mx-auto text-gray-300 mb-3" />
          <p className="font-semibold">No orders yet</p>
          <p className="text-xs text-gray-400 mt-1">When customers place orders, they appear here in real time.</p>
        </div>
      ) : (
        orders.map((order) => {
          const isPaid = order.status === 'Paid';
          return (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                className="w-full flex flex-col sm:flex-row sm:items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-gray-800 text-sm">#{order.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status}
                    </span>
                    {isPaid && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> PAID
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {order.customerName || 'Unknown'} · {timeAgo(order.createdAt || order.paymentDate)}
                  </div>
                  {/* Product thumbnails shown inline, no need to click */}
                  {Array.isArray(order.items) && order.items.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {order.items.slice(0, 4).map((it: any, i: number) => {
                        const img = productImage(it);
                        return img ? (
                          <img
                            key={i}
                            src={img}
                            alt={it?.product?.title || 'Product'}
                            className="w-9 h-9 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div key={i} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                            <Package className="w-4 h-4" />
                          </div>
                        );
                      })}
                      {order.items.length > 4 && (
                        <span className="text-[11px] font-bold text-gray-400 ml-1">+{order.items.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-gray-800">
                      ₹{new Intl.NumberFormat('en-IN').format(Number(order.totalResellAmount || order.totalWholesaleAmount || order.paymentAmount || 0))}
                    </div>
                    <div className="text-[11px] text-gray-400">{order.items?.length || 0} item(s)</div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded === order.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expanded === order.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                  {/* Customer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <div className="text-[11px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Customer
                      </div>
                      <div className="text-sm font-bold text-gray-800">{order.customerName || '—'}</div>
                      <div className="text-sm text-gray-600">{order.customerPhone || '—'}</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <div className="text-[11px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Address
                      </div>
                      <div className="text-sm text-gray-700">{order.customerAddress || '—'}</div>
                      <div className="text-xs text-gray-500">
                        {order.city} {order.pincode}
                      </div>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="bg-white rounded-xl p-3 border border-gray-200">
                    <div className="text-[11px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" /> Payment
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="text-[11px] text-gray-400">Method</div>
                        <div className="font-semibold">{order.paymentMethod || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-400">Status</div>
                        <div className={`font-semibold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {order.status === 'Paid' ? 'Paid' : order.status}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-400">Amount</div>
                        <div className="font-semibold">
                          ₹{new Intl.NumberFormat('en-IN').format(Number(order.paymentAmount || order.totalResellAmount || order.totalWholesaleAmount || 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-400">Paid On</div>
                        <div className="font-semibold">
                          {order.paymentDate ? new Date(order.paymentDate).toLocaleString() : '—'}
                        </div>
                      </div>
                    </div>
                    {order.paymentUtr && (
                      <div className="text-xs text-gray-500 mt-2">UTR: {order.paymentUtr}</div>
                    )}
                    {order.cfPaymentId && (
                      <div className="text-xs text-gray-500 mt-1">
                        Cashfree Ref: {order.cfPaymentId}
                        {order.cfOrderId && <span className="hidden"> (order {order.cfOrderId})</span>}
                      </div>
                    )}
                    {order.paymentFailed === true && order.paymentError && (
                      <div className="text-xs text-red-500 mt-2 font-semibold">
                        Failed: {order.paymentError}
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="bg-white rounded-xl p-3 border border-gray-200">
                    <div className="text-[11px] font-bold text-gray-400 uppercase mb-2">Products</div>
                    {(!order.items || order.items.length === 0) ? (
                      <span className="text-sm text-gray-400">No items</span>
                    ) : (
                      <div className="space-y-3">
                        {order.items.map((it: any, i: number) => {
                          const img = productImage(it);
                          const title = it?.product?.title || it?.title || 'Product';
                          return (
                            <div key={i} className="flex items-center gap-3">
                              {img ? (
                                <img src={img} alt={title} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                                  <Package className="w-6 h-6" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 truncate">{title}</div>
                                <div className="text-xs text-gray-500">
                                  {it.selectedSize && `Size: ${it.selectedSize}`} {it.selectedColor && `· Color: ${it.selectedColor}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Qty: {it.quantity} × ₹{Number(it.price || it.resellPrice || 0)}
                                </div>
                              </div>
                              <div className="text-sm font-extrabold text-gray-800">
                                ₹{new Intl.NumberFormat('en-IN').format(Number((it.price || it.resellPrice || 0) * (it.quantity || 1)))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Status control */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-bold text-gray-500 uppercase">Update status:</span>
                    {STATUS_OPTIONS.map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatus(order.id, st)}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                          order.status === st
                            ? statusColor[st]
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { getStats, authFetch, getToken, refreshStats, hardReset } from './adminApi';
import { AdminStats } from './adminTypes';
import { DateRangeFilter, DateRange } from './DateRangeFilter';
import { saveToCache, loadFromCache, clearAdminCache } from './adminCache';
import {
  Loader, Radio, IndianRupee, CheckCircle2, Clock, Users, TrendingUp, Package, RefreshCw, Lock, X, Trash2,
} from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-extrabold text-gray-800 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(() => loadFromCache<AdminStats>('stats'));
  const [analytics, setAnalytics] = useState<any>(() => loadFromCache<any>('analytics'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRefresh, setShowRefresh] = useState(false);
  const [refreshPassword, setRefreshPassword] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [range, setRange] = useState<DateRange>({});
  const [showReset, setShowReset] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    getStats(range)
      .then((data) => {
        setStats(data);
        saveToCache('stats', data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // Live analytics
    authFetch('/api/admin/analytics')
      .then((d) => {
        setAnalytics(d);
        saveToCache('analytics', d);
      })
      .catch(() => {});
  }, [range]);

  const doRefresh = async () => {
    if (!refreshPassword) return;
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await refreshStats(refreshPassword, range);
      setStats(res.stats);
      saveToCache('stats', res.stats);
      setRefreshMsg({ ok: true, text: 'Stats recalculated for the selected period.' });
      setRefreshPassword('');
    } catch (e: any) {
      setRefreshMsg({ ok: false, text: e.message });
    } finally {
      setRefreshing(false);
    }
  };

  const doHardReset = async () => {
    if (!resetPassword) return;
    setResetting(true);
    setResetMsg(null);
    try {
      await hardReset(resetPassword);
      setStats(null);
      setAnalytics(null);
      clearAdminCache();
      setResetMsg({ ok: true, text: 'All collected data (orders, visitors, purchases) has been permanently deleted.' });
      setResetPassword('');
    } catch (e: any) {
      setResetMsg({ ok: false, text: e.message });
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh stats whenever an order is created/updated via the SSE
  // stream, instead of blindly polling. A slow 15s fallback keeps it fresh if
  // the stream briefly drops. Uses a ref to the latest load so the connection
  // is not re-established whenever the date range changes.
  const loadRef = React.useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const token = getToken();
    let controller: AbortController | null = null;
    if (token) {
      controller = new AbortController();
      fetch('/api/admin/orders/stream', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok || !res.body) return;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          const pump = () =>
            reader.read().then(({ done, value }) => {
              if (done) return;
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              buffer = parts.pop() || '';
              for (const part of parts) {
                const line = part.split('\n').find((l) => l.startsWith('data:'));
                if (line) {
                  const p = JSON.parse(line.slice(5).trim());
                  if (p && (p.type === 'created' || p.type === 'updated' || p.type === 'refresh')) loadRef.current();
                }
              }
              return pump();
            })
            .catch(() => {});
          pump();
        })
        .catch(() => {});
    }
    const id = setInterval(() => loadRef.current(), 15000);
    return () => {
      clearInterval(id);
      if (controller) controller.abort();
    };
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
      {/* Hard reset password modal */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !resetting && setShowReset(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-gray-800">Hard Reset All Data</div>
                  <div className="text-xs text-gray-400">This cannot be undone</div>
                </div>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
                onClick={() => setShowReset(false)}
                disabled={resetting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-3">
              <strong>Warning:</strong> This will permanently delete ALL collected data — every order,
              visitor record, and purchase on your site. Enter your admin password to confirm.
            </div>

            {resetMsg && (
              <div className={`text-sm font-semibold px-3 py-2 rounded-xl mb-3 ${
                resetMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {resetMsg.text}
              </div>
            )}

            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Admin password to confirm"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-300 mb-3"
              onKeyDown={(e) => e.key === 'Enter' && doHardReset()}
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowReset(false)}
                disabled={resetting}
                className="flex-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={doHardReset}
                disabled={resetting || !resetPassword}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-2.5 rounded-xl disabled:opacity-40"
              >
                {resetting ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

  const s = stats || ({
    totalOrders: 0, paidOrders: 0, totalCollection: 0, pendingOrders: 0,
    margin: 0, todayOrders: 0, totalUsers: 0, revenue: 0, remainingToCollect: 0, statusCounts: {},
  } as AdminStats);

  const money = (n: number) => '₹' + new Intl.NumberFormat('en-IN').format(Math.round(n || 0));

  const statusColors: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Paid: 'bg-emerald-100 text-emerald-700',
    Shipped: 'bg-indigo-100 text-indigo-700',
    'Out for Delivery': 'bg-purple-100 text-purple-700',
    Delivered: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-extrabold text-gray-800">Dashboard</h2>
          <p className="text-xs text-gray-400">
            {range.from || range.to ? 'Showing stats for the selected period.' : 'Showing stats for all time.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} />
          <button
            onClick={() => { setRefreshMsg(null); setRefreshPassword(''); setShowRefresh(true); }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-2 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Stats
          </button>
          <button
            onClick={() => { setResetMsg(null); setResetPassword(''); setShowReset(true); }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-lg"
          >
            <Trash2 className="w-4 h-4" /> Hard Reset
          </button>
        </div>
      </div>

      {/* Live website analytics */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 shadow-lg">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 -left-6 w-32 h-32 bg-white/10 rounded-full translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300" />
            </span>
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-100">Live Now on Website</span>
          </div>
          <div className="text-5xl font-black mt-1">{analytics?.onlineNow ?? '—'}</div>
          <div className="text-emerald-100 text-sm mt-1">
            people are currently viewing your site
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div>
              <div className="text-2xl font-extrabold">{analytics?.visitsToday ?? '—'}</div>
              <div className="text-[11px] text-emerald-100 uppercase tracking-wide">Visitors Today</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold">{analytics?.viewsToday ?? '—'}</div>
              <div className="text-[11px] text-emerald-100 uppercase tracking-wide">Page Views Today</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold">{analytics?.totalVisits ?? '—'}</div>
              <div className="text-[11px] text-emerald-100 uppercase tracking-wide">Total Visitors</div>
            </div>
          </div>
          <div className="mt-4 text-[11px] text-emerald-200 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> Auto-refreshes every 5s · a visitor counts as online if active in the last {analytics?.onlineWindowSeconds ?? 45}s
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={s.totalOrders} icon={Package} color="bg-indigo-100 text-indigo-600" />
        <StatCard label="Paid Orders" value={s.paidOrders} icon={CheckCircle2} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Total Collection" value={money(s.totalCollection)} icon={IndianRupee} color="bg-green-100 text-green-600" />
        <StatCard label="Pending" value={s.pendingOrders} icon={Clock} color="bg-amber-100 text-amber-600" />
        <StatCard label="Today's Orders" value={s.todayOrders} icon={TrendingUp} color="bg-purple-100 text-purple-600" />
        <StatCard label="Total Users" value={s.totalUsers} icon={Users} color="bg-blue-100 text-blue-600" />
        <StatCard label="Margin Earned" value={money(s.margin)} icon={TrendingUp} color="bg-rose-100 text-rose-600" />
        <StatCard label="Gross Revenue" value={money(s.revenue)} icon={IndianRupee} color="bg-teal-100 text-teal-600" />
        <StatCard label="Remaining to Collect" value={money(s.remainingToCollect)} icon={Clock} color="bg-orange-100 text-orange-600" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-extrabold text-gray-800 mb-4">Order Status Breakdown</h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(s.statusCounts).length === 0 ? (
            <span className="text-sm text-gray-400">No orders yet.</span>
          ) : (
            Object.entries(s.statusCounts).map(([status, count]) => (
              <span key={status} className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
                {status}: {count}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 text-sm text-purple-800">
        <strong>Tip:</strong> Data updates live whenever orders change. Use <strong>Refresh Stats</strong> to
        recalculate everything from the first order up to now (asks for your admin password).
      </div>

      {/* Refresh password modal */}
      {showRefresh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !refreshing && setShowRefresh(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-gray-800">Refresh Stats</div>
                  <div className="text-xs text-gray-400">Enter admin password to recompute</div>
                </div>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
                onClick={() => setShowRefresh(false)}
                disabled={refreshing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              This reads all orders from the very beginning and recalculates totals, paid, pending and amounts.
            </p>

            {refreshMsg && (
              <div className={`text-sm font-semibold px-3 py-2 rounded-xl mb-3 ${
                refreshMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {refreshMsg.text}
              </div>
            )}

            <input
              type="password"
              value={refreshPassword}
              onChange={(e) => setRefreshPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-300 mb-3"
              onKeyDown={(e) => e.key === 'Enter' && doRefresh()}
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowRefresh(false)}
                disabled={refreshing}
                className="flex-1 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={doRefresh}
                disabled={refreshing || !refreshPassword}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 px-3 py-2.5 rounded-xl disabled:opacity-40"
              >
                {refreshing ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

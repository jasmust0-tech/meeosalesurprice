import React, { useEffect, useState } from 'react';
import { getUsers } from './adminApi';
import { AdminUser } from './adminTypes';
import { saveToCache, loadFromCache } from './adminCache';
import { Loader, Users, Phone, MapPin, RefreshCw, IndianRupee } from 'lucide-react';

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>(() => loadFromCache<AdminUser[]>('users') || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const load = () => {
    getUsers()
      .then((d) => {
        setUsers(d.users);
        saveToCache('users', d.users);
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  if (loading && users.length === 0) {
    return <div className="flex justify-center py-20"><Loader className="w-8 h-8 text-purple-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-800">Users</h2>
          <p className="text-xs text-gray-400">Realtime customers. Last update: {lastUpdated || '—'}</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-2 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <Users className="w-14 h-14 mx-auto text-gray-300 mb-3" />
          <p className="font-semibold">No users yet</p>
          <p className="text-xs text-gray-400 mt-1">Customers who placed orders will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-lg font-extrabold shrink-0">
                  {(user.name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-gray-800 truncate">{user.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {user.phone || '—'}
                  </div>
                </div>
              </div>
              {user.city && (
                <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" /> {user.city}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 text-center">
                <div>
                  <div className="text-lg font-extrabold text-gray-800">{user.orderCount}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Orders</div>
                </div>
                <div className="col-span-1">
                  <div className="text-lg font-extrabold text-emerald-600">
                    ₹{new Intl.NumberFormat('en-IN').format(Math.round(user.totalSpent || 0))}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center justify-center gap-0.5">
                    <IndianRupee className="w-2.5 h-2.5" /> Spent
                  </div>
                </div>
                <div>
                  <div className="text-sm font-extrabold text-gray-800">
                    {user.lastOrderAt ? new Date(user.lastOrderAt).toLocaleDateString() : '—'}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Last Order</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAuth, getUsername } from './adminApi';
import {
  LayoutDashboard, Settings, Fingerprint, ShoppingBag, Users, KeyRound,
  LogOut, Menu, X, Store, CreditCard,
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/firebase', label: 'Firebase Config', icon: Fingerprint },
  { to: '/admin/cashfree', label: 'Cashfree Payments', icon: CreditCard },
  { to: '/admin/tracking', label: 'UPI, Pixel & Analytics', icon: Settings },
  { to: '/admin/password', label: 'Change Password', icon: KeyRound },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const username = getUsername() || 'admin';

  const handleLogout = () => {
    clearAuth();
    navigate('/admin/login');
  };

  const SidebarNav = () => (
    <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isActive ? 'bg-[#7b1fa2] text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-[#7b1fa2] flex items-center justify-center">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-extrabold text-sm leading-tight">Admin Panel</div>
          <div className="text-xs text-purple-300">Store Management</div>
        </div>
        <button className="lg:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>
      <SidebarNav />
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold">
            {username.slice(0, 1).toUpperCase()}
          </div>
          <div className="text-sm">
            <div className="font-bold">{username}</div>
            <div className="text-xs text-gray-400">Administrator</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-[#1e1b2e] text-white fixed inset-y-0 left-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="w-64 bg-[#1e1b2e] text-white h-full relative z-10">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Mobile-only hamburger to open the sidebar (floating button) */}
        <button
          className="lg:hidden fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-[#7b1fa2] text-white shadow-lg flex items-center justify-center"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

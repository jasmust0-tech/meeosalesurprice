import React, { useState } from 'react';
import { changePassword } from './adminApi';
import { Lock, Eye, EyeOff, CheckCircle2, Loader } from 'lucide-react';

export function AdminChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (next.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (next !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      setSuccess(true);
      setCurrent(''); setNext(''); setConfirm('');
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const input = (label: string, value: string, setter: (v: string) => void, placeholder: string, autoComplete: string) => (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => setter(e.target.value)}
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-md">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-gray-800 mb-1">Change Admin Password</h2>
        <p className="text-xs text-gray-400 mb-5">Update the password used to sign in to this admin panel.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Password changed successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {input('Current Password', current, setCurrent, 'Enter current password', 'current-password')}
          {input('New Password', next, setNext, 'Enter new password', 'new-password')}
          {input('Confirm New Password', confirm, setConfirm, 'Re-enter new password', 'new-password')}

          <button
            type="button"
            onClick={() => setShow(!show)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {show ? 'Hide passwords' : 'Show passwords'}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7b1fa2] hover:bg-[#6a1b9a] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader className="w-5 h-5 mx-auto animate-spin" /> : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

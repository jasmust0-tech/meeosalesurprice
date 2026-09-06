import React, { useEffect, useState } from 'react';
import { getSettings, saveSettings } from './adminApi';
import { AppSettings } from './adminTypes';
import {
  Save, Loader, CheckCircle2, Plus, X, Eye, EyeOff, Smartphone, Target, BarChart3,
} from 'lucide-react';

const defaultSettings: AppSettings = {
  siteName: '',
  upi: { address: '', notePrefix: 'Order Payment' },
  firebase: {
    apiKey: '', projectId: '', appId: '', authDomain: '',
    firestoreDatabaseId: '(default)', storageBucket: '', messagingSenderId: '',
  },
  pixels: [],
  gaCodes: [],
};

export function AdminTracking() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showUpi, setShowUpi] = useState(false);
  const [pixelInput, setPixelInput] = useState('');
  const [gaInput, setGaInput] = useState('');

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings({
          ...defaultSettings,
          ...s,
          firebase: { ...defaultSettings.firebase, ...s.firebase },
          upi: { ...defaultSettings.upi, ...s.upi },
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addPixel = () => {
    const v = pixelInput.trim().replace(/[^0-9]/g, '');
    if (v && /^\d{8,25}$/.test(v) && !settings.pixels.includes(v)) {
      setSettings((p) => ({ ...p, pixels: [...p.pixels, v] }));
    }
    setPixelInput('');
  };

  const addGa = () => {
    const v = gaInput.trim().toUpperCase();
    if (v && !settings.gaCodes.includes(v)) {
      setSettings((p) => ({ ...p, gaCodes: [...p.gaCodes, v] }));
    }
    setGaInput('');
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader className="w-8 h-8 text-purple-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Settings saved. The store will pick them up on next load.
        </div>
      )}

      {/* Site name */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-purple-600" />
          <h3 className="font-extrabold text-gray-800">Site Name</h3>
        </div>
        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Store / Site Name</label>
        <input
          type="text"
          value={settings.siteName}
          onChange={(e) => setSettings((p) => ({ ...p, siteName: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          placeholder="Online Store"
        />
        <p className="text-[11px] text-gray-400 mt-1">Shown as the merchant name on the UPI payment page.</p>
      </div>

      {/* UPI */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-purple-600" />
          <h3 className="font-extrabold text-gray-800">UPI Payment Address</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">UPI ID / VPA</label>
            <div className="relative">
              <input
                type={showUpi ? 'text' : 'text'}
                value={settings.upi.address}
                onChange={(e) => setSettings((p) => ({ ...p, upi: { ...p.upi, address: e.target.value } }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="yourname@okhdfcbank"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowUpi(!showUpi)}
                type="button"
              >
                {showUpi ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Part 1 of the pixel 12-digit — your UPI VPA like paytm_xxx@pty.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Payment Note Prefix</label>
            <input
              type="text"
              value={settings.upi.notePrefix}
              onChange={(e) => setSettings((p) => ({ ...p, upi: { ...p.upi, notePrefix: e.target.value } }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="Order Payment"
            />
            <p className="text-[11px] text-gray-400 mt-1">Shown as the transaction note before the order ID.</p>
          </div>
        </div>
      </div>

      {/* Pixels */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple-600" />
          <h3 className="font-extrabold text-gray-800">Meta Pixel IDs</h3>
          <span className="text-[11px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">Multiple supported</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {settings.pixels.length === 0 && (
            <span className="text-sm text-gray-400">No pixel added yet.</span>
          )}
          {settings.pixels.map((px, i) => (
            <span key={i} className="inline-flex items-center gap-2 bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-full text-sm font-semibold">
              {px}
              <button
                type="button"
                onClick={() => setSettings((p) => ({ ...p, pixels: p.pixels.filter((_, idx) => idx !== i) }))}
                className="text-purple-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={pixelInput}
            onChange={(e) => setPixelInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPixel())}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            placeholder="Enter Meta Pixel ID (numeric)"
          />
          <button
            type="button"
            onClick={addPixel}
            className="inline-flex items-center gap-1.5 bg-purple-600 text-white font-bold px-4 rounded-xl hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          You can add multiple pixels (e.g. one for Meta, one for a tracking pixel like X/TikTok) — all will be loaded.
        </p>
      </div>

      {/* GA */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h3 className="font-extrabold text-gray-800">Google Analytics IDs</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {settings.gaCodes.length === 0 && (
            <span className="text-sm text-gray-400">No GA ID added yet.</span>
          )}
          {settings.gaCodes.map((g, i) => (
            <span key={i} className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-full text-sm font-semibold">
              {g}
              <button
                type="button"
                onClick={() => setSettings((p) => ({ ...p, gaCodes: p.gaCodes.filter((_, idx) => idx !== i) }))}
                className="text-blue-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={gaInput}
            onChange={(e) => setGaInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGa())}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            placeholder="e.g. G-XXXXXXXXXX"
          />
          <button
            type="button"
            onClick={addGa}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-bold px-4 rounded-xl hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Add one or more GA4 Measurement IDs. They will be loaded on the storefront.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#7b1fa2] hover:bg-[#6a1b9a] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Tracking Settings
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { getSettings, saveSettings } from './adminApi';
import { AppSettings } from './adminTypes';
import {
  Save, Loader, CheckCircle2, AlertTriangle, Eye, EyeOff, CreditCard, Link2, ExternalLink,
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
  cashfree: { enabled: false, environment: 'sandbox', clientId: '', secretKey: '' },
};

function SecretField({ id, label, value, onChange, placeholder, help }: any) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm pr-11"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {help && <p className="text-[11px] text-gray-400 mt-1">{help}</p>}
    </div>
  );
}

export function AdminCashfree() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings({
          ...defaultSettings,
          ...s,
          firebase: { ...defaultSettings.firebase, ...s.firebase },
          upi: { ...defaultSettings.upi, ...s.upi },
          cashfree: { ...defaultSettings.cashfree, ...(s.cashfree || {}) },
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof NonNullable<AppSettings['cashfree']>, value: any) =>
    setSettings((p) => ({ ...p, cashfree: { ...(p.cashfree || defaultSettings.cashfree), [key]: value } }));

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

  const webhookUrl = `${window.location.origin}/api/payments/cashfree/webhook`;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader className="w-8 h-8 text-purple-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-2 flex gap-3 text-purple-800">
        <CreditCard className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <strong>Cashfree Payment Gateway</strong>
          <p className="text-purple-700">
            Accept cards, UPI, net banking &amp; wallets from the checkout. Orders made via Cashfree are
            verified through a webhook and show up as <b>Paid</b> or <b>Failed</b> in the Orders panel automatically.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl mb-4">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Cashfree settings saved.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5">
        <div>
          <h3 className="font-extrabold text-gray-800 mb-1">API Credentials</h3>
          <p className="text-xs text-gray-500">
            Get these from the <span className="font-semibold">Cashfree Dashboard → Settings → API Keys</span>.
          </p>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div>
            <div className="text-sm font-extrabold text-gray-800">Enable Cashfree payments</div>
            <div className="text-xs text-gray-500">Show the Cashfree option on the checkout page</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.cashfree?.enabled}
            onClick={() => update('enabled', !settings.cashfree?.enabled)}
            className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${settings.cashfree?.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.cashfree?.enabled ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Environment</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'sandbox', label: 'Test (Sandbox)', desc: 'For testing with test keys' },
              { id: 'prod', label: 'Production (Live)', desc: 'Real payments' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => update('environment', opt.id)}
                className={`text-left border-2 rounded-xl p-3 transition-colors ${settings.cashfree?.environment === opt.id ? 'border-[#9f2089] bg-[#fdf2f9]' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className={`text-sm font-extrabold ${settings.cashfree?.environment === opt.id ? 'text-[#9f2089]' : 'text-gray-800'}`}>
                  {opt.label}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <SecretField
          id="cfClientId" label="Client ID (App ID)" placeholder="Your Cashfree Client ID"
          value={settings.cashfree?.clientId || ''} onChange={(v: string) => update('clientId', v)}
        />
        <SecretField
          id="cfSecret" label="Secret Key" placeholder="Your Cashfree Secret Key"
          value={settings.cashfree?.secretKey || ''} onChange={(v: string) => update('secretKey', v)}
          help="Used to call the Cashfree API and to verify webhook signatures."
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-purple-600" />
          <h3 className="font-extrabold text-gray-800">Webhook URL</h3>
        </div>
        <p className="text-xs text-gray-500">
          Add this URL in the Cashfree Dashboard under <b>Developers → Webhooks</b> for events
          <b> Payment Success</b> and <b>Payment Failed</b>. This is how orders get automatically marked
          Paid / Failed with no manual work.
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={webhookUrl}
            onFocus={(e) => e.target.select()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm font-mono text-gray-700"
          />
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(webhookUrl).catch(() => {}); }}
            className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-xl text-xs"
          >
            Copy
          </button>
        </div>
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Open Cashfree dashboard to configure webhooks
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#7b1fa2] hover:bg-[#6a1b9a] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Cashfree Settings
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm">
          <strong>Going live?</strong> Your domain must be whitelisted by Cashfree before production
          payments are allowed. Use Test (Sandbox) mode first with your sandbox keys to verify the full
          flow works end-to-end.
        </p>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { getSettings, saveSettings } from './adminApi';
import { AppSettings } from './adminTypes';
import { Save, Loader, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

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

function Field({ id, label, value, onChange, type = 'text', placeholder, help }: any) {
  const [show, setShow] = useState(false);
  const isSecret = type === 'secret';
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
          type={isSecret ? (show ? 'text' : 'password') : 'text'}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          autoComplete="off"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {help && <p className="text-[11px] text-gray-400 mt-1">{help}</p>}
    </div>
  );
}

export function AdminFirebaseConfig() {
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
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateFirebase = (key: string, value: string) =>
    setSettings((p) => ({ ...p, firebase: { ...p.firebase, [key]: value } }));

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

  if (loading) {
    return <div className="flex justify-center py-20"><Loader className="w-8 h-8 text-purple-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3 text-amber-800">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm">
          <strong>Important:</strong> These credentials connect your store to Firestore. After saving,
          the server reconnects to the new Firebase project immediately. Make sure the new project is
          set up with Firestore and has permissive rules (or your app will lose order persistence).
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl mb-4">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Settings saved &amp; Firestore reconnected.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5">
        <div>
          <h3 className="font-extrabold text-gray-800 mb-1">Firebase Credentials</h3>
          <p className="text-xs text-gray-500">Copy these from your Firebase Console → Project Settings → General.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="projectId" label="Project ID" value={settings.firebase.projectId}
            onChange={(v: string) => updateFirebase('projectId', v)}
            placeholder="my-project-1234" help="Project ID (not project name)"
          />
          <Field
            id="apiKey" label="Web API Key" type="secret" value={settings.firebase.apiKey}
            onChange={(v: string) => updateFirebase('apiKey', v)}
            placeholder="AIzaSy..."
          />
          <Field
            id="appId" label="App ID" value={settings.firebase.appId}
            onChange={(v: string) => updateFirebase('appId', v)}
            placeholder="1:123456789:web:abcdef"
          />
          <Field
            id="messaging" label="Messaging Sender ID" value={settings.firebase.messagingSenderId}
            onChange={(v: string) => updateFirebase('messagingSenderId', v)}
            placeholder="123456789"
          />
          <Field
            id="authDomain" label="Auth Domain" value={settings.firebase.authDomain}
            onChange={(v: string) => updateFirebase('authDomain', v)}
            placeholder="my-project.firebaseapp.com"
          />
          <Field
            id="databaseId" label="Firestore Database ID" value={settings.firebase.firestoreDatabaseId}
            onChange={(v: string) => updateFirebase('firestoreDatabaseId', v)}
            placeholder="(default)" help="Use (default) unless you created a named database"
          />
          <Field
            id="storage" label="Storage Bucket" value={settings.firebase.storageBucket}
            onChange={(v: string) => updateFirebase('storageBucket', v)}
            placeholder="my-project.appspot.com"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#7b1fa2] hover:bg-[#6a1b9a] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Firebase Config
        </button>
      </div>
    </div>
  );
}

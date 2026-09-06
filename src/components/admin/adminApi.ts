import { AppSettings, AdminOrder, AdminUser, AdminStats } from './adminTypes';

const TOKEN_KEY = 'meesho_admin_token';
const USER_KEY = 'meesho_admin_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}

export function getUsername(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionValidated = false;
}

export async function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) {
    throw new Error(body.error || 'Login failed');
  }
  setToken(body.token, body.username || username);
  sessionValidated = true;
}

let sessionValidated = false;

export async function checkAuth(): Promise<boolean> {
  if (!getToken()) return false;
  // Cache the result for the current browser session so navigating between
  // admin pages does not re-run the network check (and show the loader) each time.
  if (sessionValidated) return true;
  try {
    await authFetch('/api/admin/me');
    sessionValidated = true;
    return true;
  } catch {
    clearAuth();
    sessionValidated = false;
    return false;
  }
}

export function getSettings(): Promise<AppSettings> {
  return authFetch<AppSettings>('/api/admin/settings');
}

export function saveSettings(s: AppSettings): Promise<{ success: boolean }> {
  return authFetch('/api/admin/settings', { method: 'POST', body: JSON.stringify(s) });
}

export function getOrders(range?: { from?: string; to?: string }): Promise<{ orders: AdminOrder[]; range?: any }> {
  const qs = rangeToQuery(range);
  return authFetch(`/api/admin/orders${qs}`);
}

export function updateOrderStatus(id: string, status: string): Promise<{ success: boolean }> {
  return authFetch(`/api/admin/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
}

export function getUsers(): Promise<{ users: AdminUser[] }> {
  return authFetch('/api/admin/users');
}

export function getStats(range?: { from?: string; to?: string }): Promise<AdminStats> {
  const qs = rangeToQuery(range);
  return authFetch(`/api/admin/stats${qs}`);
}

export function refreshStats(password: string, range?: { from?: string; to?: string }): Promise<{ success: boolean; stats: AdminStats }> {
  return authFetch('/api/admin/stats/refresh', {
    method: 'POST',
    body: JSON.stringify({ password, from: range?.from, to: range?.to }),
  });
}

function rangeToQuery(range?: { from?: string; to?: string }): string {
  if (!range || (!range.from && !range.to)) return '';
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
  return authFetch('/api/admin/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function hardReset(password: string): Promise<{ success: boolean }> {
  return authFetch('/api/admin/hard-reset', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

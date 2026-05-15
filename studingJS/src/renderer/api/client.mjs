import { API_BASE, STORAGE_KEYS } from './config.mjs';

// SECURITY NOTE (pre-v1.0 production):
// Refresh token currently lives in renderer localStorage.
// Acceptable for Electron desktop (no web XSS surface, contextIsolation=true).
// Before major public launch: move to main process via ipcRenderer.invoke('auth:*')
// and store with electron-store or OS keychain (keytar).
// Tracking: README2 #1

let _accessToken = null;

export const tokenStore = {
  get()           { return _accessToken; },
  set(t)          { _accessToken = t; },
  clear()         { _accessToken = null; },
};

async function _refreshSession() {
  const rt = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!rt) throw new Error('NO_REFRESH_TOKEN');

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) {
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    tokenStore.clear();
    throw new Error('REFRESH_FAILED');
  }

  const data = await res.json();
  tokenStore.set(data.accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
  if (data.plan) localStorage.setItem(STORAGE_KEYS.userPlan, data.plan);
  return data.accessToken;
}

/**
 * Authenticated fetch.  Auto-refreshes on 401.
 * Throws on network error or after failed refresh.
 */
export async function apiFetch(path, options = {}) {
  const makeReq = (token) => fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  let res = await makeReq(tokenStore.get());

  if (res.status === 401) {
    const newToken = await _refreshSession();
    res = await makeReq(newToken);
  }

  return res;
}

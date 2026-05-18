import { API_BASE, STORAGE_KEYS } from './config.mjs';

let _accessToken = null;

export const tokenStore = {
  get()           { return _accessToken; },
  set(t)          { _accessToken = t; },
  clear()         { _accessToken = null; },
};

async function _refreshSession() {
  const result = await window.appApi.authRefresh({ apiBase: API_BASE });
  if (!result?.ok) {
    tokenStore.clear();
    throw new Error('REFRESH_FAILED');
  }

  const data = result.data ?? {};
  tokenStore.set(data.accessToken);
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

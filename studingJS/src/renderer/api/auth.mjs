import { API_BASE, STORAGE_KEYS } from './config.mjs';
import { tokenStore, apiFetch } from './client.mjs';

function _storeSession(data) {
  tokenStore.set(data.accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
  localStorage.setItem(STORAGE_KEYS.userPlan,     data.plan ?? 'free');
}

function _clearSession() {
  tokenStore.clear();
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.userEmail);
  localStorage.removeItem(STORAGE_KEYS.userPlan);
}

export async function register(email, password) {
  console.log(`[auth] register → ${email}`);
  const res = await fetch(`${API_BASE}/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.warn(`[auth] register failed: ${data.message}`);
    throw new Error(data.message || 'Ошибка регистрации');
  }
  _storeSession(data);
  localStorage.setItem(STORAGE_KEYS.userEmail, email);
  console.log(`[auth] registered OK, plan=${data.plan}`);
  return data;
}

export async function login(email, password) {
  console.log(`[auth] login → ${email}`);
  const res = await fetch(`${API_BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.warn(`[auth] login failed: ${data.message}`);
    throw new Error(data.message || 'Неверный email или пароль');
  }
  _storeSession(data);
  localStorage.setItem(STORAGE_KEYS.userEmail, email);
  console.log(`[auth] logged in OK, plan=${data.plan}`);
  return data;
}

export async function logout(refreshToken) {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // best-effort
  } finally {
    _clearSession();
  }
}

/** Returns true if session was restored successfully. */
export async function restoreSession() {
  const rt = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!rt) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) { _clearSession(); return false; }
    const data = await res.json();
    _storeSession(data);
    return true;
  } catch {
    return false;
  }
}

export function getStoredEmail() {
  return localStorage.getItem(STORAGE_KEYS.userEmail) || null;
}

export function getStoredPlan() {
  return localStorage.getItem(STORAGE_KEYS.userPlan) || null;
}

export function isLoggedIn() {
  return Boolean(tokenStore.get());
}

import { API_BASE, STORAGE_KEYS } from './config.mjs';
import { tokenStore } from './client.mjs';

function _dropLegacyRefreshToken() {
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
}

function _storeSession(data, email) {
  _dropLegacyRefreshToken();
  tokenStore.set(data.accessToken);
  localStorage.setItem(STORAGE_KEYS.userPlan,     data.plan ?? 'free');
  if (email || data.email) {
    localStorage.setItem(STORAGE_KEYS.userEmail, email ?? data.email);
  }
}

function _clearSession() {
  _dropLegacyRefreshToken();
  tokenStore.clear();
  localStorage.removeItem(STORAGE_KEYS.userEmail);
  localStorage.removeItem(STORAGE_KEYS.userPlan);
}

function _unwrapAuthResult(result, fallbackMessage) {
  if (result?.ok) {
    return result.data ?? {};
  }
  const message = result?.data?.message || result?.data?.error || result?.data?.code || fallbackMessage;
  throw new Error(message);
}

export async function register(email, password) {
  console.log(`[auth] register → ${email}`);
  const data = _unwrapAuthResult(
    await window.appApi.authRegister({ apiBase: API_BASE, email, password }),
    'Ошибка регистрации',
  );
  _storeSession(data, email);
  console.log(`[auth] registered OK, plan=${data.plan}`);
  return data;
}

export async function login(email, password) {
  console.log(`[auth] login → ${email}`);
  const data = _unwrapAuthResult(
    await window.appApi.authLogin({ apiBase: API_BASE, email, password }),
    'Неверный email или пароль',
  );
  _storeSession(data, email);
  console.log(`[auth] logged in OK, plan=${data.plan}`);
  return data;
}

export async function logout() {
  try {
    await window.appApi.authLogout({ apiBase: API_BASE, accessToken: tokenStore.get() });
  } catch {
    // best-effort
  } finally {
    _clearSession();
  }
}

/** Returns true if session was restored successfully. */
export async function restoreSession() {
  try {
    const result = await window.appApi.authRefresh({ apiBase: API_BASE });
    if (!result?.ok) { _clearSession(); return false; }
    const data = result.data ?? {};
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

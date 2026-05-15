const fs = require('node:fs');
const path = require('node:path');
const { app, safeStorage } = require('electron');

let memorySession = null;

function normalizeApiBase(apiBase) {
  const url = new URL(String(apiBase || '').trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('INVALID_API_BASE');
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error('INSECURE_API_BASE');
  }
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

function storePath() {
  return path.join(app.getPath('userData'), 'auth-session.json');
}

function canEncrypt() {
  return Boolean(safeStorage?.isEncryptionAvailable?.());
}

function protectRefreshToken(refreshToken) {
  if (!canEncrypt()) {
    return null;
  }
  return safeStorage.encryptString(refreshToken).toString('base64');
}

function unprotectRefreshToken(record) {
  if (!record?.encryptedRefreshToken || !canEncrypt()) {
    return null;
  }
  return safeStorage.decryptString(Buffer.from(record.encryptedRefreshToken, 'base64'));
}

function readSession() {
  if (memorySession) {
    return memorySession;
  }

  try {
    const record = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
    const refreshToken = unprotectRefreshToken(record);
    if (!refreshToken) {
      return null;
    }
    return {
      apiBase: record.apiBase,
      refreshToken,
      plan: record.plan,
      email: record.email,
    };
  } catch {
    return null;
  }
}

function writeSession({ apiBase, refreshToken, plan, email }) {
  const session = {
    apiBase: normalizeApiBase(apiBase),
    refreshToken: String(refreshToken || ''),
    plan: plan || 'free',
    email: email || null,
  };

  if (!session.refreshToken) {
    clearSession();
    return;
  }

  const encryptedRefreshToken = protectRefreshToken(session.refreshToken);
  if (!encryptedRefreshToken) {
    memorySession = session;
    try { fs.rmSync(storePath(), { force: true }); } catch {}
    return;
  }

  memorySession = null;
  fs.writeFileSync(storePath(), JSON.stringify({
    apiBase: session.apiBase,
    encryptedRefreshToken,
    plan: session.plan,
    email: session.email,
    updatedAt: new Date().toISOString(),
  }, null, 2));
}

function clearSession() {
  memorySession = null;
  try { fs.rmSync(storePath(), { force: true }); } catch {}
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function publicSession(data, email) {
  return {
    accessToken: data.accessToken,
    plan: data.plan ?? 'free',
    email: email ?? null,
  };
}

function sameApiBase(left, right) {
  return normalizeApiBase(left) === normalizeApiBase(right);
}

async function authWithCredentials(kind, payload) {
  const apiBase = normalizeApiBase(payload?.apiBase);
  const email = String(payload?.email || '').trim();
  const password = String(payload?.password || '');
  const endpoint = kind === 'register' ? '/auth/register' : '/auth/login';

  const res = await fetch(`${apiBase}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await readJson(res);

  if (!res.ok) {
    clearSession();
    return { ok: false, status: res.status, data };
  }

  writeSession({ apiBase, refreshToken: data.refreshToken, plan: data.plan, email });
  return { ok: true, status: res.status, data: publicSession(data, email) };
}

async function refreshSession(payload) {
  const apiBase = normalizeApiBase(payload?.apiBase);
  const session = readSession();
  if (!session || !sameApiBase(session.apiBase, apiBase)) {
    return { ok: false, status: 401, data: { code: 'NO_REFRESH_TOKEN' } };
  }

  const res = await fetch(`${apiBase}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const data = await readJson(res);

  if (!res.ok) {
    clearSession();
    return { ok: false, status: res.status, data };
  }

  writeSession({
    apiBase,
    refreshToken: data.refreshToken,
    plan: data.plan,
    email: session.email,
  });
  return { ok: true, status: res.status, data: publicSession(data, session.email) };
}

async function logoutSession(payload) {
  const apiBase = normalizeApiBase(payload?.apiBase);
  const accessToken = payload?.accessToken ? String(payload.accessToken) : '';
  const session = readSession();

  try {
    if (session && sameApiBase(session.apiBase, apiBase) && accessToken) {
      await fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
    }
  } finally {
    clearSession();
  }

  return { ok: true };
}

function registerAuthSessionIpc(ipcMain) {
  ipcMain.handle('app:authRegister', (_event, payload) => authWithCredentials('register', payload));
  ipcMain.handle('app:authLogin', (_event, payload) => authWithCredentials('login', payload));
  ipcMain.handle('app:authRefresh', (_event, payload) => refreshSession(payload));
  ipcMain.handle('app:authLogout', (_event, payload) => logoutSession(payload));
  ipcMain.handle('app:authClear', () => {
    clearSession();
    return { ok: true };
  });
}

module.exports = {
  registerAuthSessionIpc,
  normalizeApiBase,
};

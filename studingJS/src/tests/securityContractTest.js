const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function source(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function assertNoRefreshTokenLocalStorage(file) {
  const text = source(file);
  assert.doesNotMatch(
    text,
    /localStorage\.(getItem|setItem)\([^)]*refreshToken/,
    `${file} must not read/write refresh tokens in renderer localStorage`,
  );
  assert.doesNotMatch(
    text,
    /localStorage\.(getItem|setItem)\(['"]jt\.auth\.refreshToken['"]/,
    `${file} must not read/write literal refresh-token localStorage keys`,
  );
}

assertNoRefreshTokenLocalStorage('renderer/api/auth.mjs');
assertNoRefreshTokenLocalStorage('renderer/api/client.mjs');
assertNoRefreshTokenLocalStorage('renderer/app.js');

{
  const preload = source('../preload.js');
  assert.match(preload, /openTrustedExternal/);
  assert.match(preload, /TRUSTED_EXTERNAL_HOSTS/);
  assert.doesNotMatch(preload, /openExternal:\s*\(url\)\s*=>\s*shell\.openExternal\(String\(url\)\)/);
}

{
  const app = source('renderer/app.js');
  assert.match(app, /syncResult\.conflict/);
  assert.doesNotMatch(app, /setSyncDot\(ok\s*\?/);
}

console.log('Security contract passed.');

const path = require('node:path');

const SENSITIVE_ENV_KEY_PATTERN = /^(DATABASE_URL|JWT_SECRET|JWT_REFRESH_SECRET|GEMINI_API_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|RESEND_API_KEY|SENTRY_DSN|GITHUB_TOKEN|GH_TOKEN|OPENAI_API_KEY)$/i;

const NATIVE_COMPILE_TIMEOUT_MS = 20_000;
const NATIVE_RUN_TIMEOUT_MS = 12_000;

const SAFE_ENV_KEYS = [
  'PATH',
  'Path',
  'SystemRoot',
  'WINDIR',
  'TEMP',
  'TMP',
  'COMSPEC',
  'ComSpec',
  'USERPROFILE',
  'LOCALAPPDATA',
  'APPDATA',
  'HOMEDRIVE',
  'HOMEPATH',
  'HOME',
];

function buildSafeProcessEnv(extraPath) {
  const env = {};

  for (const key of SAFE_ENV_KEYS) {
    if (process.env[key] && !SENSITIVE_ENV_KEY_PATTERN.test(key)) {
      env[key] = process.env[key];
    }
  }

  if (extraPath) {
    const pathKey = env.Path ? 'Path' : 'PATH';
    env[pathKey] = `${extraPath}${path.delimiter}${env[pathKey] || ''}`;
  }

  env.JS_INFINITE_TRAINER_SANDBOX = '1';
  return env;
}

module.exports = {
  SENSITIVE_ENV_KEY_PATTERN,
  NATIVE_COMPILE_TIMEOUT_MS,
  NATIVE_RUN_TIMEOUT_MS,
  buildSafeProcessEnv,
};

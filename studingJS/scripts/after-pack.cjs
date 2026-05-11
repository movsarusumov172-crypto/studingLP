'use strict';
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

module.exports = async function afterPack(context) {
  const { appOutDir, packager } = context;
  const exeName = `${packager.appInfo.productName}.exe`;
  const exePath = path.join(appOutDir, exeName);
  const icoPath = path.join(packager.projectDir, 'build', 'icon.ico');

  if (!fs.existsSync(exePath)) { console.log('[icon] exe not found, skip'); return; }
  if (!fs.existsSync(icoPath)) { console.log('[icon] ico not found, skip'); return; }

  // Find newest rcedit-x64.exe in electron-builder cache
  const cacheDir = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign');
  let rcedit = null;

  if (fs.existsSync(cacheDir)) {
    const entries = fs.readdirSync(cacheDir)
      .map((e) => ({ name: e, n: Number(e) || 0 }))
      .sort((a, b) => b.n - a.n);

    for (const { name } of entries) {
      const candidate = path.join(cacheDir, name, 'rcedit-x64.exe');
      if (fs.existsSync(candidate)) { rcedit = candidate; break; }
    }
  }

  if (!rcedit) {
    console.warn('[icon] rcedit-x64.exe not found in cache — icon not embedded');
    return;
  }

  try {
    execFileSync(rcedit, [exePath, '--set-icon', icoPath], { stdio: 'pipe' });
    console.log(`[icon] embedded into ${exeName}`);
  } catch (err) {
    console.warn('[icon] rcedit failed:', err.message);
  }
};

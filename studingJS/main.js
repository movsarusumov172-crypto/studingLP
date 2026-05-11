const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { registerExecutionIpc } = require('./src/execution');

// Disable Chromium background networking — prevents unexpected telemetry/prefetch calls
// that happen at the process level and bypass the renderer's Content Security Policy.
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('disable-features', 'NetworkServiceInProcess,SafeBrowsing');
app.commandLine.appendSwitch('metrics-recording-only');

const captureSafeMode =
  process.argv.includes('--capture-safe') ||
  process.env.JS_TRAINER_CAPTURE_SAFE === '1';

if (captureSafeMode) {
  app.disableHardwareAcceleration();
}

function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath) || fs.existsSync(targetPath)) {
    return;
  }

  const sourceStat = fs.statSync(sourcePath);
  if (sourceStat.isDirectory()) {
    fs.cpSync(sourcePath, targetPath, { recursive: true, force: false, errorOnExist: false });
    return;
  }

  fs.copyFileSync(sourcePath, targetPath);
}

function migrateLegacyProfile(legacyRoot, profileRoot) {
  const legacyEntries = ['Local Storage', 'Session Storage', 'IndexedDB', 'Cookies', 'Preferences'];
  for (const entry of legacyEntries) {
    copyIfExists(path.join(legacyRoot, entry), path.join(profileRoot, entry));
  }
}

function configureProfilePaths() {
  const legacyUserDataPath = app.getPath('userData');
  const localAppData = process.env.LOCALAPPDATA || app.getPath('appData');
  const profileRoot = path.join(localAppData, 'JS Infinite Trainer');

  fs.mkdirSync(profileRoot, { recursive: true });
  migrateLegacyProfile(legacyUserDataPath, profileRoot);
  app.setPath('userData', profileRoot);
  app.setPath('sessionData', profileRoot);
}

configureProfilePaths();

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#0b1220',
    show: false,
    autoHideMenuBar: true,
    title: 'JS Infinite Trainer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`[renderer did-fail-load] ${errorCode} ${errorDescription} ${validatedURL}`);
  });
  win.webContents.on('render-process-gone', (_, details) => {
    console.error('[renderer render-process-gone]', details);
  });
  win.webContents.on('console-message', (_, level, message, line, sourceId) => {
    const prefix = ['[log]', '[info]', '[warn]', '[error]'][level] ?? '[log]';
    if (level >= 2) {
      console.error(`[renderer ${prefix}] ${sourceId}:${line} ${message}`);
    } else {
      console.log(`[renderer ${prefix}] ${message}`);
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
}

registerExecutionIpc(ipcMain);

app.setAppUserModelId('JS Infinite Trainer');
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

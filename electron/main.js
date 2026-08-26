/*
 * main.js -- the Orbdyn desktop window.
 *
 * Electron loads the built React UI and connects to Supabase in the cloud.
 * No local Express server is required.
 */

const { app, BrowserWindow, Tray, Menu, Notification, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const { setupAutoUpdater } = require('./updater');

app.setAppUserModelId('com.orbdyn.desktop');

let win = null;
let tray = null;
let quitting = false;

function devServerUrl() {
  const port = process.env.ORBDYN_DEV_PORT || '3000';
  return `http://127.0.0.1:${port}`;
}

function productionIndexPath() {
  return path.join(__dirname, '..', 'public', 'index.html');
}

function useDevServer() {
  return !app.isPackaged && process.env.ORBDYN_DEV === '1';
}

function appUrl() {
  if (useDevServer()) return devServerUrl();
  return `file://${productionIndexPath().replace(/\\/g, '/')}`;
}

function isDevServerUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url || '');
}

function iconPath() {
  return path.join(__dirname, '..', 'assets', 'icon.png');
}

function iconImage({ tray = false } = {}) {
  try {
    let img = nativeImage.createFromPath(iconPath());
    if (img.isEmpty()) return undefined;
    if (tray) {
      const size = process.platform === 'darwin' ? 22 : 16;
      img = img.resize({ width: size, height: size });
    }
    return img;
  } catch (_) {}
  return undefined;
}

function applyAppIcon() {
  const icon = iconImage();
  if (!icon) return;
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(icon);
  }
  if (win && !win.isDestroyed()) {
    win.setIcon(icon);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 900,
    minHeight: 620,
    title: 'Orbdyn',
    backgroundColor: '#0f1115',
    icon: iconImage(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = appUrl();
  if (useDevServer()) {
    win.loadURL(url);
  } else {
    win.loadFile(productionIndexPath());
  }

  win.once('ready-to-show', () => {
    applyAppIcon();
    win.show();
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, failedUrl) => {
    if (errorCode === -3) return;
    console.error('[orbdyn] Failed to load UI:', errorCode, errorDescription, failedUrl || url);
    if (useDevServer()) {
      setTimeout(() => {
        if (!win.isDestroyed()) win.loadURL(failedUrl || url);
      }, 1000);
      return;
    }
    setTimeout(() => {
      if (!win.isDestroyed()) win.loadFile(productionIndexPath());
    }, 1000);
  });

  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (isDevServerUrl(targetUrl) || targetUrl.startsWith('file://')) {
      return { action: 'allow' };
    }
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function buildTray() {
  try {
    const img = iconImage({ tray: true });
    tray = new Tray(img || nativeImage.createEmpty());
  } catch (_) {
    return;
  }

  const rebuild = () => {
    tray.setToolTip('Orbdyn — cloud workspace');
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Open Orbdyn', click: () => { win.show(); win.focus(); } },
        { type: 'separator' },
        { label: 'Quit Orbdyn', click: () => { quitting = true; app.quit(); } },
      ])
    );
  };

  rebuild();
  tray.on('click', () => {
    if (win.isVisible()) win.hide();
    else {
      win.show();
      win.focus();
    }
  });
}

function menu() {
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'About Orbdyn',
          click: () => dialog.showMessageBox(win, {
            type: 'info',
            title: 'Orbdyn',
            message: 'Orbdyn cloud workspace',
            detail: 'Your workspace data is stored securely in Supabase.\nSign in with your team credentials to collaborate from anywhere.',
          }),
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { label: 'Quit', click: () => { quitting = true; app.quit(); } },
      ],
    },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    applyAppIcon();
    buildTray();
    menu();

    const { ipcMain } = require('electron');
    ipcMain.on('orbdyn:notify', (_e, { title, body }) => {
      if (!Notification.isSupported()) return;
      const n = new Notification({ title: title || 'Orbdyn', body: body || '', icon: iconImage() });
      n.on('click', () => { win.show(); win.focus(); });
      n.show();
    });
    ipcMain.on('orbdyn:badge', (_e, count) => {
      if (process.platform === 'darwin') app.dock.setBadge(count ? String(count) : '');
      if (win && win.setOverlayIcon) win.setOverlayIcon(null, count ? String(count) + ' unread' : '');
    });

    setupAutoUpdater(() => win);
  });

  app.on('before-quit', () => {
    quitting = true;
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });
  app.on('window-all-closed', () => {});
  app.on('activate', () => {
    if (win) win.show();
    else createWindow();
  });
}

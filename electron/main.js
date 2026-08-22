/*
 * main.js -- the Orbdyn desktop window.
 *
 * Electron loads the built React UI and connects to Supabase in the cloud.
 * No local Express server is required.
 */

const { app, BrowserWindow, Tray, Menu, Notification, shell, dialog, nativeImage } = require('electron');
const path = require('path');

app.setAppUserModelId('com.orbdyn.desktop');

let win = null;
let tray = null;
let quitting = false;

function appUrl() {
  // npm start builds the UI first (prestart) and loads the packaged files here.
  // Set ORBDYN_DEV=1 with `npm run dev` if you want Vite hot reload on :3000.
  if (process.env.ORBDYN_DEV === '1') return 'http://localhost:3000';
  return `file://${path.join(__dirname, '..', 'public', 'index.html').replace(/\\/g, '/')}`;
}

function iconImage() {
  const file = path.join(__dirname, '..', 'assets', 'icon.png');
  try {
    const img = nativeImage.createFromPath(file);
    if (!img.isEmpty()) return img;
  } catch (_) {}
  return undefined;
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

  win.loadURL(appUrl());
  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost:3000') || url.startsWith('file://')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
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
    const img = iconImage();
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
  });

  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => {});
  app.on('activate', () => {
    if (win) win.show();
    else createWindow();
  });
}

/*
 * main.js -- the Orbdyn desktop window.
 *
 * PLAIN ENGLISH: This is what runs when you double-click the Orbdyn icon.
 * It quietly starts the Orbdyn server on your computer, opens a normal-looking
 * desktop window pointed at it, puts an icon in your system tray / menu bar,
 * and shows a real operating-system pop-up whenever a notification arrives.
 */

const { app, BrowserWindow, Tray, Menu, Notification, shell, dialog, nativeImage } = require('electron');
const path = require('path');

// Windows needs this so notifications show "Orbdyn" instead of "electron.app".
app.setAppUserModelId('com.orbdyn.desktop');

const server = require('../server/index.js');
const store = require('../server/store.js');
const tunnel = require('../server/tunnel.js');

let win = null;
let tray = null;
let quitting = false;

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

  win.loadURL('http://127.0.0.1:' + server.PORT);
  win.once('ready-to-show', () => win.show());

  // Links to other websites open in the normal browser, not inside Orbdyn.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1:' + server.PORT) || url.startsWith('http://localhost:' + server.PORT)) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Closing the window keeps Orbdyn running in the tray so colleagues can
  // still reach your documents and you still get notifications.
  win.on('close', (e) => {
    if (!quitting) { e.preventDefault(); win.hide(); }
  });
}

function buildTray() {
  try {
    const img = iconImage();
    tray = new Tray(img || nativeImage.createEmpty());
  } catch (_) { return; }
  const rebuild = () => {
    const s = tunnel.status();
    tray.setToolTip('Orbdyn' + (s.url ? ' — shared at ' + s.url : ''));
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Orbdyn', click: () => { win.show(); win.focus(); } },
      { type: 'separator' },
      { label: 'Open my Orbdyn folder', click: () => shell.openPath(store.HOME) },
      s.url
        ? { label: 'Copy sharing link', click: () => require('electron').clipboard.writeText(s.url) }
        : { label: 'Not shared online', enabled: false },
      { type: 'separator' },
      { label: 'Quit Orbdyn', click: () => { quitting = true; app.quit(); } },
    ]));
  };
  rebuild();
  tunnel.onChange(rebuild);
  tray.on('click', () => { win.isVisible() ? win.hide() : (win.show(), win.focus()); });
}

function menu() {
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Open my Orbdyn folder', click: () => shell.openPath(store.HOME) },
        {
          label: 'Where is my data?',
          click: () => dialog.showMessageBox(win, {
            type: 'info',
            title: 'Your Orbdyn data',
            message: 'Everything is stored on this computer',
            detail: store.HOME + '\n\nWork list: orbdyn-data.json\nDocuments: files/\nDated backups: backups/\n\nNothing is stored on any online service.',
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

// Only one copy of Orbdyn may run, otherwise two copies would fight over the
// same data file.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

  app.whenReady().then(async () => {
    try {
      await server.start();
    } catch (err) {
      dialog.showErrorBox('Orbdyn could not start', String(err && err.message || err));
      app.quit();
      return;
    }
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
      if (win) win.setOverlayIcon && win.setOverlayIcon(null, count ? String(count) + ' unread' : '');
    });
  });

  app.on('before-quit', () => { quitting = true; try { tunnel.stop(); store.flush(); } catch (_) {} });
  app.on('window-all-closed', () => { /* stay alive in the tray */ });
  app.on('activate', () => { if (win) { win.show(); } else createWindow(); });
}

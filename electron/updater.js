const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

function sendStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('orbdyn:update-status', payload);
  }
}

function setupAutoUpdater(getWindow) {
  mainWindow = getWindow();

  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendStatus({
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatus({
      status: 'not-available',
      version: info?.version || app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatus({
      status: 'downloading',
      percent: Math.round(progress.percent || 0),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus({
      status: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (error) => {
    sendStatus({
      status: 'error',
      message: error?.message || 'Update check failed',
    });
  });

  ipcMain.handle('orbdyn:get-app-version', () => app.getVersion());

  ipcMain.handle('orbdyn:check-for-updates', async () => {
    if (!app.isPackaged) {
      return { status: 'dev', version: app.getVersion() };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        status: 'checking',
        version: result?.updateInfo?.version || null,
      };
    } catch (error) {
      sendStatus({ status: 'error', message: error?.message || 'Update check failed' });
      throw error;
    }
  });

  ipcMain.handle('orbdyn:download-update', async () => {
    if (!app.isPackaged) return { status: 'dev' };
    await autoUpdater.downloadUpdate();
    return { status: 'downloading' };
  });

  ipcMain.handle('orbdyn:install-update', () => {
    if (!app.isPackaged) return { status: 'dev' };
    autoUpdater.quitAndInstall(false, true);
    return { status: 'installing' };
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 8000);

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

module.exports = { setupAutoUpdater };

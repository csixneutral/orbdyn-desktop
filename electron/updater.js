const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let userInitiatedUpdate = false;

function sendStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('orbdyn:update-status', payload);
  }
}

function formatUpdateError(error) {
  const message = error?.message || 'Update check failed';
  if (/404|releases\.atom|authentication token/i.test(message)) {
    return 'Could not reach the update server. Publish a GitHub Release for this app, or make the repository public.';
  }
  return message;
}

function setupAutoUpdater(getWindow) {
  mainWindow = getWindow();

  ipcMain.handle('orbdyn:get-app-version', () => app.getVersion());

  ipcMain.handle('orbdyn:check-for-updates', async () => {
    if (!app.isPackaged) {
      return { status: 'dev', version: app.getVersion() };
    }
    userInitiatedUpdate = true;
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        status: 'checking',
        version: result?.updateInfo?.version || null,
      };
    } catch (error) {
      sendStatus({ status: 'error', message: formatUpdateError(error) });
      throw error;
    } finally {
      userInitiatedUpdate = false;
    }
  });

  ipcMain.handle('orbdyn:download-update', async () => {
    if (!app.isPackaged) return { status: 'dev' };
    userInitiatedUpdate = true;
    try {
      await autoUpdater.downloadUpdate();
      return { status: 'downloading' };
    } catch (error) {
      sendStatus({ status: 'error', message: formatUpdateError(error) });
      throw error;
    } finally {
      userInitiatedUpdate = false;
    }
  });

  ipcMain.handle('orbdyn:install-update', () => {
    if (!app.isPackaged) return { status: 'dev' };
    autoUpdater.quitAndInstall(false, true);
    return { status: 'installing' };
  });

  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;

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
    if (!userInitiatedUpdate) {
      console.warn('[orbdyn] Background update check failed:', error?.message || error);
      return;
    }
    sendStatus({
      status: 'error',
      message: formatUpdateError(error),
    });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.warn('[orbdyn] Background update check failed:', error?.message || error);
    });
  }, 8000);

  setInterval(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.warn('[orbdyn] Background update check failed:', error?.message || error);
    });
  }, 4 * 60 * 60 * 1000);
}

module.exports = { setupAutoUpdater };

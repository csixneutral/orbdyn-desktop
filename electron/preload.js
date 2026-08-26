/*
 * preload.js -- a tiny, safe bridge.
 *
 * PLAIN ENGLISH: The Orbdyn screen is ordinary web code and is deliberately
 * kept away from your computer's internals. This file hands it exactly two
 * abilities and nothing more: "show a pop-up" and "set the unread count".
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orbdyn', {
  desktop: true,
  notify: (title, body) => ipcRenderer.send('orbdyn:notify', { title, body }),
  badge: (count) => ipcRenderer.send('orbdyn:badge', count),
  updates: {
    getVersion: () => ipcRenderer.invoke('orbdyn:get-app-version'),
    check: () => ipcRenderer.invoke('orbdyn:check-for-updates'),
    download: () => ipcRenderer.invoke('orbdyn:download-update'),
    install: () => ipcRenderer.invoke('orbdyn:install-update'),
    onStatus: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('orbdyn:update-status', listener);
      return () => ipcRenderer.removeListener('orbdyn:update-status', listener);
    },
  },
});

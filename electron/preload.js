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
});

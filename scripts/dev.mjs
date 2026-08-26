#!/usr/bin/env node
/**
 * Optional: live UI reload while developing.
 * Normal daily use: npm start
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchElectronIcon } from './patch-electron-icon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const vite = spawn(npmCmd, ['run', 'dev:ui'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

let electron = null;

const startElectron = () => {
  if (electron) return;
  electron = spawn(npmCmd, ['exec', 'electron', '.'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ORBDYN_DEV: '1' },
  });
  electron.on('exit', (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
};

setTimeout(async () => {
  await patchElectronIcon();
  startElectron();
}, 2500);

vite.on('exit', () => {
  if (electron) electron.kill();
});

process.on('SIGINT', () => {
  vite.kill();
  if (electron) electron.kill();
  process.exit(0);
});

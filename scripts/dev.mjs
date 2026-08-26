#!/usr/bin/env node
/**
 * Live UI reload while developing.
 * Waits for Vite to be ready and passes the same port to Electron.
 */

import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchElectronIcon } from './patch-electron-icon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function findFreePort(start = 3000, attempts = 30) {
  return new Promise((resolve, reject) => {
    const tryPort = (port, remaining) => {
      if (remaining <= 0) {
        reject(new Error('Could not find a free dev port'));
        return;
      }

      const server = net.createServer();
      server.unref();
      server.on('error', () => tryPort(port + 1, remaining - 1));
      server.listen(port, '127.0.0.1', () => {
        const address = server.address();
        server.close(() => resolve(address.port));
      });
    };

    tryPort(start, attempts);
  });
}

async function waitForDevServer(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Vite did not start on port ${port} within ${timeoutMs / 1000}s`);
}

function startVite(port) {
  return spawn(npmCmd, ['run', 'dev:ui', '--', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

const port = await findFreePort(3000);
console.log(`[orbdyn] Dev server port: ${port}`);

let vite = startVite(port);
let electron = null;

const startElectron = async () => {
  if (electron) return;

  try {
    await waitForDevServer(port);
  } catch (error) {
    console.error(`[orbdyn] ${error.message}`);
    vite.kill();
    process.exit(1);
  }

  await patchElectronIcon();

  electron = spawn(npmCmd, ['exec', 'electron', '.'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ORBDYN_DEV: '1',
      ORBDYN_DEV_PORT: String(port),
    },
  });

  electron.on('exit', (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
};

startElectron().catch((error) => {
  console.error('[orbdyn] Failed to start Electron:', error.message);
  vite.kill();
  process.exit(1);
});

vite.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[orbdyn] Vite exited with code ${code}`);
  }
  if (electron) electron.kill();
});

process.on('SIGINT', () => {
  vite.kill();
  if (electron) electron.kill();
  process.exit(0);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rcedit from 'rcedit';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function patchElectronIcon() {
  if (process.platform !== 'win32') return;

  const electronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
  const iconIco = path.join(root, 'assets', 'icon.ico');

  if (!fs.existsSync(electronExe) || !fs.existsSync(iconIco)) return;

  try {
    await rcedit(electronExe, { icon: iconIco });
  } catch (err) {
    console.warn('[orbdyn] Could not patch Electron icon for dev:', err.message);
  }
}

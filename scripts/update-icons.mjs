/**
 * Regenerate icon.ico from assets/icon.png (Windows desktop/taskbar).
 * Replace assets/icon.png with your 512x512 PNG first, then run:
 *   npm run update:icons
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconPng = path.join(root, 'assets', 'icon.png');
const iconIco = path.join(root, 'assets', 'icon.ico');
const appIcon = path.join(root, 'src', 'assets', 'app-icon.png');
const staticIcon = path.join(root, 'static', 'icon-512.png');

if (!fs.existsSync(iconPng)) {
  console.error(`Missing ${iconPng}`);
  process.exit(1);
}

const icoBuffer = await pngToIco(iconPng);
fs.writeFileSync(iconIco, icoBuffer);
fs.copyFileSync(iconPng, appIcon);
fs.copyFileSync(iconPng, staticIcon);
console.log(`Wrote ${iconIco}`);
console.log(`Synced ${appIcon}`);
console.log(`Synced ${staticIcon}`);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(root, 'public', 'assets');
const files = fs.readdirSync(assetsDir).filter((name) => name.startsWith('index-') && name.endsWith('.js'));

if (!files.length) {
  console.error('[orbdyn] Built JS bundle not found in public/assets');
  process.exit(1);
}

const bundle = fs.readFileSync(path.join(assetsDir, files[0]), 'utf8');
if (!/https:\/\/[a-z0-9-]+\.supabase\.co/i.test(bundle)) {
  console.error('[orbdyn] Supabase URL was not embedded in the production bundle.');
  console.error('[orbdyn] The release would show "Cannot connect to Orbdyn" for all users.');
  process.exit(1);
}

console.log('[orbdyn] Verified Supabase config in production bundle');

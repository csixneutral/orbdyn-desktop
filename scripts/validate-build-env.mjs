#!/usr/bin/env node
/**
 * Ensures Supabase env vars exist before production builds.
 * Used locally (.env) and in CI (GitHub Actions secrets).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function clean(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function loadEnvFile(filename) {
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

function mergeEnv(...sources) {
  const merged = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== '') merged[key] = value;
    }
  }
  return merged;
}

const fromEnv = mergeEnv(
  loadEnvFile('.env'),
  loadEnvFile('.env.production'),
  {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  }
);

const url = clean(fromEnv.VITE_SUPABASE_URL);
const key = clean(fromEnv.VITE_SUPABASE_ANON_KEY);

if (!url || !key) {
  console.error('[orbdyn] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  console.error('[orbdyn] Local: add them to Orbdyn/.env');
  console.error('[orbdyn] CI: add repository secrets with the exact names above, then rebuild the release.');
  process.exit(1);
}

try {
  new URL(url);
} catch {
  console.error('[orbdyn] VITE_SUPABASE_URL is not a valid URL.');
  process.exit(1);
}

if (process.env.GITHUB_ACTIONS) {
  fs.writeFileSync(
    path.join(root, '.env.production'),
    `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${key}\n`,
    'utf8'
  );
}

console.log('[orbdyn] Supabase build config OK');

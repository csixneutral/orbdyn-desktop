#!/usr/bin/env node
/**
 * Ensures Supabase env vars exist before production builds.
 * Reads .env.production (committed) or CI/local overrides.
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

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return null;
  }
}

function projectRefFromAnonKey(key) {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
    return payload.ref || null;
  } catch {
    return null;
  }
}

async function verifyBootstrap(url, anonKey) {
  const res = await fetch(`${url}/rest/v1/rpc/public_bootstrap`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase bootstrap failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

const fromEnv = mergeEnv(
  loadEnvFile('.env.production'),
  loadEnvFile('.env'),
  {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  }
);

const url = clean(fromEnv.VITE_SUPABASE_URL);
const key = clean(fromEnv.VITE_SUPABASE_ANON_KEY);

if (!url || !key) {
  console.error('[orbdyn] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  console.error('[orbdyn] Add them to .env.production (recommended for releases) or Orbdyn/.env');
  process.exit(1);
}

try {
  new URL(url);
} catch {
  console.error('[orbdyn] VITE_SUPABASE_URL is not a valid URL.');
  process.exit(1);
}

const urlRef = projectRefFromUrl(url);
const keyRef = projectRefFromAnonKey(key);
if (urlRef && keyRef && urlRef !== keyRef) {
  console.error('[orbdyn] VITE_SUPABASE_ANON_KEY does not belong to VITE_SUPABASE_URL.');
  console.error(`[orbdyn] URL project: ${urlRef}, key project: ${keyRef}`);
  process.exit(1);
}

try {
  await verifyBootstrap(url, key);
  console.log(`[orbdyn] Supabase bootstrap OK (${urlRef || 'project'})`);
} catch (error) {
  console.error(`[orbdyn] ${error.message}`);
  process.exit(1);
}

console.log('[orbdyn] Supabase build config OK');

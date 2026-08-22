#!/usr/bin/env node
/**
 * Applies Orbdyn Supabase migrations to the linked project database.
 *
 * Required in .env:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Optional (enables automatic migration apply):
 *   SUPABASE_DB_PASSWORD   — Database password from Supabase Dashboard → Settings → Database
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return null;
  }
}

async function checkBootstrap(url, anonKey) {
  const res = await fetch(`${url}/rest/v1/rpc/public_bootstrap`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function applyMigrations(connectionString) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const migrationsDir = path.join(root, 'supabase', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying ${file}...`);
    await client.query(sql);
    console.log(`  ✓ ${file}`);
  }

  await client.end();
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const dbPassword = env.SUPABASE_DB_PASSWORD;

  if (!url || !anonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  const projectRef = projectRefFromUrl(url);
  console.log(`Supabase project: ${projectRef || url}`);

  const check = await checkBootstrap(url, anonKey);
  if (check.ok) {
    console.log('✓ Database schema is already applied.');
    console.log(JSON.parse(check.body));
    return;
  }

  if (check.status !== 404) {
    console.error('Unexpected API response:', check.status, check.body);
    process.exit(1);
  }

  console.log('Database migration has not been applied yet.');

  if (!dbPassword) {
    console.log('\nTo apply automatically, add your database password to .env:');
    console.log('  SUPABASE_DB_PASSWORD=your-database-password');
    console.log('\nThen run: npm run supabase:setup\n');
    console.log('Or paste the SQL files manually in Supabase Dashboard → SQL Editor:');
    console.log('  1. supabase/migrations/001_orbdyn_schema.sql');
    console.log('  2. supabase/migrations/002_storage_realtime.sql\n');
    console.log('After that, in Supabase Dashboard:');
    console.log('  • Auth → Providers → Email → disable "Confirm email"');
    console.log('  • Edge Functions → deploy supabase/functions/create-user');
    process.exit(2);
  }

  const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

  try {
    await applyMigrations(connectionString);
  } catch (err) {
    console.error('Direct database connection failed:', err.message || err);
    throw err;
  }

  console.log('Reloading PostgREST schema cache...');
  const reloadClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await reloadClient.connect();
  await reloadClient.query(`NOTIFY pgrst, 'reload schema'`);
  await reloadClient.end();

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const after = await checkBootstrap(url, anonKey);
  if (!after.ok) {
    console.error('Migration finished but public_bootstrap is still unavailable:', after.body);
    process.exit(1);
  }

  console.log('\n✓ Migrations applied successfully.');
  console.log(JSON.parse(after.body));
  console.log('\nNext steps in Supabase Dashboard:');
  console.log('  1. Auth → Providers → Email → disable "Confirm email"');
  console.log('  2. Deploy edge function: supabase/functions/create-user');
  console.log('  3. Start the app: npm run dev:ui (then npm start)');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

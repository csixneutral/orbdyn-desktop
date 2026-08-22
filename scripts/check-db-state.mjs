import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const ref = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];
const client = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const ws = await client.query('select id, org_name, created_at from public.workspaces');
const prof = await client.query('select id, username, email, role from public.profiles');
const auth = await client.query(
  'select id, email, created_at, email_confirmed_at from auth.users order by created_at desc limit 5'
);
console.log('workspaces', ws.rows);
console.log('profiles', prof.rows);
console.log('auth.users', auth.rows);
await client.end();

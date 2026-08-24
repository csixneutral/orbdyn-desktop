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
await client.query(fs.readFileSync(path.join(root, 'supabase/migrations/010_workspace_members_profiles_fkey.sql'), 'utf8'));
await client.query(`NOTIFY pgrst, 'reload schema'`);
await client.end();
console.log('Applied 010_workspace_members_profiles_fkey.sql');

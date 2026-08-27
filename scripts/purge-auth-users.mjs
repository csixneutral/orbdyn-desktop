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

const userIds = [];
let force = false;
for (const arg of process.argv.slice(2)) {
  if (arg === '--force') force = true;
  else userIds.push(arg);
}
if (!userIds.length) {
  console.error('Usage: node scripts/purge-auth-users.mjs <user-id> [user-id...]');
  process.exit(1);
}

const ref = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];
const client = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/020_fix_auth_user_delete.sql'),
  'utf8'
);
await client.query(migration);

for (const userId of userIds) {
  console.log(`Purging ${userId}...`);
  await client.query('select public.purge_auth_user($1::uuid, $2::boolean)', [userId, force]);
  console.log(`  ✓ deleted ${userId}`);
}

await client.query(`NOTIFY pgrst, 'reload schema'`);
await client.end();
console.log('Done.');

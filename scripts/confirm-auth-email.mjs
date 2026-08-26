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

const identifier = process.argv[2];
if (!identifier) {
  console.error('Usage: node scripts/confirm-auth-email.mjs <username-or-email>');
  process.exit(1);
}

await client.connect();

let email = identifier.includes('@') ? identifier.trim().toLowerCase() : null;

if (!email) {
  const { rows } = await client.query(
    `select u.email
     from public.profiles p
     join auth.users u on u.id = p.id
     where p.username = lower(trim($1))
     limit 1`,
    [identifier]
  );
  email = rows[0]?.email || null;

  if (!email) {
    const authDomain = new URL(env.VITE_SUPABASE_URL).hostname;
    email = `${identifier.trim().toLowerCase()}@${authDomain}`;
  }
}

await client.query(
  `update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at = now()
   where lower(email) = lower($1)`,
  [email]
);

const { rows } = await client.query(
  'select id, email, email_confirmed_at from auth.users where lower(email) = lower($1)',
  [email]
);

if (!rows[0]) {
  console.error(`No auth user found for: ${email}`);
  process.exit(1);
}

console.log(rows[0]);
await client.end();

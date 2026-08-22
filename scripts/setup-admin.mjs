import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  return {
    root,
    env: Object.fromEntries(
      fs
        .readFileSync(path.join(root, '.env'), 'utf8')
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const idx = line.indexOf('=');
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        })
    ),
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key.startsWith('--') && value && !value.startsWith('--')) {
      args[key.slice(2)] = value;
      i += 1;
    }
  }
  return args;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findUserIdByEmail(adminClient, email) {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => (u.email || '').toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

const { env } = loadEnv();
const args = parseArgs(process.argv);
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!env.VITE_SUPABASE_URL || !serviceRoleKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in .env (Supabase Dashboard → Project Settings → API → service_role).'
  );
  process.exit(1);
}

const orgName = args.orgName || 'My Team';
const name = args.name;
const username = args.username;
const email = (args.email || '').trim().toLowerCase();
const password = args.password;

if (!name || !username || !email || !password) {
  console.error(
    'Usage: node scripts/setup-admin.mjs --name "Full Name" --username alex --email alex@company.com --password secret [--orgName "My Team"]'
  );
  process.exit(1);
}

if (!isValidEmail(email)) {
  console.error('Enter a valid email address.');
  process.exit(1);
}

if (String(password).length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}

const adminClient = createClient(env.VITE_SUPABASE_URL, serviceRoleKey);

const { count, error: workspaceCountError } = await adminClient
  .from('workspaces')
  .select('*', { count: 'exact', head: true });

if (workspaceCountError) {
  console.error(workspaceCountError.message);
  process.exit(1);
}

if ((count || 0) > 0) {
  console.error('Orbdyn is already set up. Use Sign in in the app instead.');
  process.exit(1);
}

const uname = String(username).trim().toLowerCase();
let userId = null;

const { data: created, error: createError } = await adminClient.auth.admin.createUser({
  email,
  password: String(password),
  email_confirm: true,
  user_metadata: { name: String(name).trim(), username: uname },
});

if (createError) {
  const message = createError.message || 'Could not create user';
  if (/already|registered|exists/i.test(message)) {
    userId = await findUserIdByEmail(adminClient, email);
    if (!userId) {
      console.error('Account already exists but could not be found. Try Sign in in the app.');
      process.exit(1);
    }

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      console.error('Account already exists. Use Sign in in the app.');
      process.exit(1);
    }

    await adminClient.auth.admin.updateUserById(userId, {
      password: String(password),
      email_confirm: true,
      user_metadata: { name: String(name).trim(), username: uname },
    });
  } else {
    console.error(message);
    process.exit(1);
  }
} else {
  userId = created.user.id;
}

const { data: setupData, error: setupError } = await adminClient.rpc('complete_user_setup', {
  p_user_id: userId,
  p_org_name: orgName,
  p_name: String(name).trim(),
  p_username: uname,
  p_email: email,
});

if (setupError) {
  if (!createError) {
    await adminClient.auth.admin.deleteUser(userId);
  }
  console.error(setupError.message);
  process.exit(1);
}

console.log('Setup complete.');
console.log(`Workspace: ${setupData?.orgName || orgName}`);
console.log(`Admin: ${setupData?.user?.username || uname} (${email})`);
console.log('Open Orbdyn and use Sign in with your email or username.');

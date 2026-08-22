import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findUserIdByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { count, error: workspaceCountError } = await adminClient
      .from('workspaces')
      .select('*', { count: 'exact', head: true });

    if (workspaceCountError) {
      return json({ error: workspaceCountError.message }, 400);
    }

    if ((count || 0) > 0) {
      return json({ error: 'Orbdyn is already set up. Use Sign in instead.', code: 'ALREADY_SETUP' }, 409);
    }

    const { orgName, name, username, password, email } = await req.json();
    if (!name || !username || !password || !email) {
      return json({ error: 'Name, username, email and password are required' }, 400);
    }

    const uname = String(username).trim().toLowerCase();
    const contactEmail = String(email).trim().toLowerCase();

    if (!isValidEmail(contactEmail)) {
      return json({ error: 'Enter a valid email address' }, 400);
    }

    if (String(password).length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400);
    }

    let userId: string | null = null;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: contactEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: { name: String(name).trim(), username: uname },
    });

    if (createError) {
      const message = createError.message || 'Could not create user';
      if (/already|registered|exists/i.test(message)) {
        userId = await findUserIdByEmail(adminClient, contactEmail);
        if (!userId) {
          return json({ error: 'Account already exists. Try signing in.', code: 'ALREADY_EXISTS' }, 409);
        }

        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (existingProfile) {
          return json({ error: 'Account already exists. Try signing in.', code: 'ALREADY_EXISTS' }, 409);
        }
      } else {
        return json({ error: message }, 400);
      }
    } else {
      userId = created.user.id;
    }

    const { data: setupData, error: setupError } = await adminClient.rpc('complete_user_setup', {
      p_user_id: userId,
      p_org_name: orgName ? String(orgName).trim() : 'Orbdyn Workspace',
      p_name: String(name).trim(),
      p_username: uname,
      p_email: contactEmail,
    });

    if (setupError) {
      if (!createError) {
        await adminClient.auth.admin.deleteUser(userId);
      }
      return json({ error: setupError.message }, 400);
    }

    return json({
      orgName: setupData?.orgName,
      user: setupData?.user,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

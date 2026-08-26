import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 403, headers: corsHeaders });
    }

    const workspaceId = callerProfile.active_workspace_id || callerProfile.workspace_id;
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'Workspace not found' }), { status: 403, headers: corsHeaders });
    }

    const { data: membership, error: memberError } = await userClient
      .from('workspace_members')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (memberError || !membership || membership.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
    }

    const { name, username, password, role, email } = await req.json();
    if (!name || !username || !password) {
      return new Response(JSON.stringify({ error: 'Name, username and password are required' }), { status: 400, headers: corsHeaders });
    }

    const uname = String(username).trim().toLowerCase();
    const authDomain = new URL(supabaseUrl).hostname;
    const contactEmail = email ? String(email).trim().toLowerCase() : '';
    const syntheticEmail = contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
      ? contactEmail
      : `${uname}@${authDomain}`;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: { name, username: uname },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });
    }

    const colors = ['#3d7fe0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const resolvedRole =
      role === 'admin'
        ? 'admin'
        : role === 'viewer'
          ? 'viewer'
          : role === 'manager'
            ? 'manager'
            : role === 'member' || role === 'processor'
              ? 'member'
              : 'manager';

    const { data: profile, error: insertError } = await adminClient
      .from('profiles')
      .insert({
        id: created.user.id,
        workspace_id: workspaceId,
        active_workspace_id: workspaceId,
        name: String(name).trim(),
        username: uname,
        email: email || '',
        role: resolvedRole,
        color,
        active: true,
        last_seen: null,
      })
      .select('*')
      .single();

    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: insertError.message }), { status: 400, headers: corsHeaders });
    }

    await adminClient.from('workspace_members').upsert({
      user_id: created.user.id,
      workspace_id: workspaceId,
      role: resolvedRole,
    });

    await adminClient.from('activity_log').insert({
      workspace_id: workspaceId,
      actor_id: callerProfile.id,
      action: 'added a person',
      subject: profile.name,
    });

    return new Response(JSON.stringify({
      user: {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        role: profile.role,
        color: profile.color,
        active: profile.active,
        createdAt: profile.created_at,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});

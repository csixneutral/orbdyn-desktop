-- Helpers for first-time setup without hitting client signUp rate limits

create or replace function public.setup_auth_email_exists(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if exists (select 1 from public.workspaces) then
    return false;
  end if;

  return exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_email))
  );
end;
$$;

revoke all on function public.setup_auth_email_exists(text) from public;
grant execute on function public.setup_auth_email_exists(text) to anon, authenticated;

-- Allow setup_workspace to store contact email on the admin profile
create or replace function public.setup_workspace(
  p_org_name text,
  p_name text,
  p_username text,
  p_email text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.workspaces;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.workspaces) then
    raise exception 'Workspace already exists';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Profile already exists';
  end if;

  if exists (select 1 from public.profiles where username = lower(trim(p_username))) then
    raise exception 'Username already taken';
  end if;

  insert into public.workspaces (org_name)
  values (trim(p_org_name))
  returning * into v_workspace;

  insert into public.profiles (id, workspace_id, name, username, email, role, color, active, last_seen)
  values (
    auth.uid(),
    v_workspace.id,
    trim(p_name),
    lower(trim(p_username)),
    coalesce(trim(p_email), ''),
    'admin',
    '#3d7fe0',
    true,
    now()
  )
  returning * into v_profile;

  insert into public.activity_log (workspace_id, actor_id, action, subject)
  values (v_workspace.id, v_profile.id, 'created the workspace', v_workspace.org_name);

  return jsonb_build_object(
    'orgName', v_workspace.org_name,
    'user', jsonb_build_object(
      'id', v_profile.id,
      'name', v_profile.name,
      'username', v_profile.username,
      'email', v_profile.email,
      'role', v_profile.role,
      'color', v_profile.color,
      'active', v_profile.active,
      'createdAt', v_profile.created_at
    )
  );
end;
$$;

grant execute on function public.setup_workspace(text, text, text, text) to authenticated;

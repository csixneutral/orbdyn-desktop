-- Allow workspace admins to attach a newly registered auth user to the active workspace

create or replace function public.admin_attach_workspace_user(
  p_user_id uuid,
  p_name text,
  p_username text,
  p_email text default '',
  p_role text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_profile public.profiles;
  v_role text;
  v_color text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.my_role() <> 'admin' then
    raise exception 'Administrator access required';
  end if;

  v_workspace_id := public.my_workspace_id();
  if v_workspace_id is null then
    raise exception 'Workspace not found';
  end if;

  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Profile already exists';
  end if;

  if exists (select 1 from public.profiles where username = lower(trim(p_username))) then
    raise exception 'Username already taken';
  end if;

  v_role := case
    when p_role = 'admin' then 'admin'
    when p_role = 'viewer' then 'viewer'
    else 'member'
  end;

  v_color := (array['#3d7fe0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'])[
    floor(random() * 6 + 1)::int
  ];

  insert into public.profiles (
    id, workspace_id, active_workspace_id, name, username, email, role, color, active, last_seen
  )
  values (
    p_user_id,
    v_workspace_id,
    v_workspace_id,
    trim(p_name),
    lower(trim(p_username)),
    coalesce(trim(p_email), ''),
    v_role,
    v_color,
    true,
    null
  )
  returning * into v_profile;

  insert into public.workspace_members (user_id, workspace_id, role)
  values (p_user_id, v_workspace_id, v_role)
  on conflict (user_id, workspace_id) do update set role = excluded.role;

  insert into public.activity_log (workspace_id, actor_id, action, subject)
  values (v_workspace_id, auth.uid(), 'added a person', v_profile.name);

  return jsonb_build_object(
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

grant execute on function public.admin_attach_workspace_user(uuid, text, text, text, text) to authenticated;

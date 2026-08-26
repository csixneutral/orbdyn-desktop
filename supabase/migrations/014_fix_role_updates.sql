-- Fix role promote/demote: honor manager/member roles and sync profiles.role
-- (Role check constraints are updated in 013 and 015)

create or replace function public.normalize_workspace_role(p_role text)
returns text
language sql
immutable
as $$
  select case
    when p_role = 'admin' then 'admin'
    when p_role = 'viewer' then 'viewer'
    when p_role = 'manager' then 'manager'
    when p_role = 'member' then 'member'
    when p_role = 'processor' then 'member'
    else 'manager'
  end;
$$;

create or replace function public.update_workspace_member(
  p_user_id uuid,
  p_name text default null,
  p_email text default null,
  p_role text default null,
  p_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_member public.workspace_members;
  v_profile public.profiles;
  v_role text;
  v_admin_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.my_role() <> 'admin' then
    raise exception 'Administrator access required';
  end if;

  v_workspace_id := public.my_workspace_id();

  select * into v_member
  from public.workspace_members
  where user_id = p_user_id
    and workspace_id = v_workspace_id;

  if v_member.user_id is null then
    raise exception 'No such person in this organization';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;

  if p_role is not null then
    v_role := public.normalize_workspace_role(p_role);

    if v_member.role = 'admin' and v_role <> 'admin' then
      select count(*) into v_admin_count
      from public.workspace_members
      where workspace_id = v_workspace_id
        and role = 'admin';

      if v_admin_count <= 1 then
        raise exception 'You cannot remove the only administrator';
      end if;
    end if;

    update public.workspace_members
    set role = v_role
    where user_id = p_user_id
      and workspace_id = v_workspace_id;

    update public.profiles
    set role = v_role
    where id = p_user_id;
  end if;

  if p_active is not null and p_active = false and v_member.role = 'admin' then
    select count(*) into v_admin_count
    from public.workspace_members
    where workspace_id = v_workspace_id
      and role = 'admin';

    if v_admin_count <= 1 then
      raise exception 'You cannot switch off the only administrator';
    end if;
  end if;

  update public.profiles
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    email = case when p_email is null then email else coalesce(trim(p_email), '') end,
    active = coalesce(p_active, active)
  where id = p_user_id
  returning * into v_profile;

  select role into v_role
  from public.workspace_members
  where user_id = p_user_id
    and workspace_id = v_workspace_id;

  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_profile.id,
      'name', v_profile.name,
      'username', v_profile.username,
      'email', v_profile.email,
      'role', v_role,
      'color', v_profile.color,
      'active', v_profile.active,
      'createdAt', v_member.created_at
    )
  );
end;
$$;

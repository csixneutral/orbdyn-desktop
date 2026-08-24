-- Scope people to the active organization via workspace_members

alter table public.workspace_members enable row level security;

drop policy if exists "workspace members read active workspace" on public.workspace_members;
create policy "workspace members read active workspace"
  on public.workspace_members for select
  using (workspace_id = public.my_workspace_id());

drop policy if exists "profiles update self or admin" on public.profiles;
create policy "profiles update self or admin"
  on public.profiles for update
  using (
    id = auth.uid()
    or (
      public.my_role() = 'admin'
      and exists (
        select 1
        from public.workspace_members wm
        where wm.user_id = profiles.id
          and wm.workspace_id = public.my_workspace_id()
      )
    )
  );

create or replace function public.list_workspace_people()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'username', p.username,
          'email', p.email,
          'role', wm.role,
          'color', p.color,
          'active', p.active,
          'created_at', wm.created_at,
          'last_seen', p.last_seen
        )
        order by wm.created_at asc
      )
      from public.workspace_members wm
      join public.profiles p on p.id = wm.user_id
      where wm.workspace_id = public.my_workspace_id()
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.list_workspace_people() to authenticated;

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
    v_role := case
      when p_role = 'admin' then 'admin'
      when p_role = 'viewer' then 'viewer'
      else 'member'
    end;

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

grant execute on function public.update_workspace_member(uuid, text, text, text, boolean) to authenticated;

create or replace function public.remove_workspace_member(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_member public.workspace_members;
  v_profile public.profiles;
  v_admin_count int;
  v_remaining int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.my_role() <> 'admin' then
    raise exception 'Administrator access required';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot remove your own account from this organization';
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

  if v_member.role = 'admin' then
    select count(*) into v_admin_count
    from public.workspace_members
    where workspace_id = v_workspace_id
      and role = 'admin';

    if v_admin_count <= 1 then
      raise exception 'You cannot remove the only administrator';
    end if;
  end if;

  delete from public.workspace_members
  where user_id = p_user_id
    and workspace_id = v_workspace_id;

  select count(*) into v_remaining
  from public.workspace_members
  where user_id = p_user_id;

  if v_remaining = 0 then
    delete from public.profiles where id = p_user_id;
  end if;

  insert into public.activity_log (workspace_id, actor_id, action, subject)
  values (v_workspace_id, auth.uid(), 'removed a person', coalesce(v_profile.name, 'Member'));

  return jsonb_build_object('ok', true, 'profileDeleted', v_remaining = 0);
end;
$$;

grant execute on function public.remove_workspace_member(uuid) to authenticated;

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

  v_role := case
    when p_role = 'admin' then 'admin'
    when p_role = 'viewer' then 'viewer'
    else 'member'
  end;

  if exists (
    select 1
    from public.profiles p
    join public.workspace_members wm on wm.user_id = p.id
    where wm.workspace_id = v_workspace_id
      and p.username = lower(trim(p_username))
      and p.id <> p_user_id
  ) then
    raise exception 'Username already taken in this organization';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;

  if v_profile.id is not null then
    if exists (
      select 1
      from public.workspace_members
      where user_id = p_user_id
        and workspace_id = v_workspace_id
    ) then
      raise exception 'This person is already in this organization';
    end if;

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
        'role', v_role,
        'color', v_profile.color,
        'active', v_profile.active,
        'createdAt', v_profile.created_at
      )
    );
  end if;

  if exists (select 1 from public.profiles where username = lower(trim(p_username))) then
    raise exception 'Username already taken';
  end if;

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
      'role', v_role,
      'color', v_profile.color,
      'active', v_profile.active,
      'createdAt', v_profile.created_at
    )
  );
end;
$$;

grant execute on function public.admin_attach_workspace_user(uuid, text, text, text, text) to authenticated;

-- Multi-workspace: users can create and switch between organizations

alter table public.profiles
  add column if not exists active_workspace_id uuid references public.workspaces(id);

update public.profiles
set active_workspace_id = workspace_id
where active_workspace_id is null;

alter table public.profiles
  alter column active_workspace_id set not null;

create table if not exists public.workspace_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, workspace_id)
);

insert into public.workspace_members (user_id, workspace_id, role)
select id, workspace_id, role
from public.profiles
on conflict do nothing;

create or replace function public.sync_workspace_member_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (user_id, workspace_id, role)
  values (new.id, new.workspace_id, new.role)
  on conflict (user_id, workspace_id) do update set role = excluded.role;

  if new.active_workspace_id is null then
    update public.profiles
    set active_workspace_id = new.workspace_id
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_workspace_member on public.profiles;
create trigger profiles_workspace_member
after insert on public.profiles
for each row execute function public.sync_workspace_member_on_profile_insert();

create or replace function public.my_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.active_workspace_id, p.workspace_id)
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select wm.role
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.workspace_id = public.my_workspace_id()
    ),
    (select role from public.profiles where id = auth.uid())
  );
$$;

drop policy if exists "workspace members read workspace" on public.workspaces;
create policy "workspace members read workspace"
  on public.workspaces for select
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.workspace_id = workspaces.id
    )
  );

drop policy if exists "profiles in workspace" on public.profiles;
create policy "profiles in workspace"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.user_id = profiles.id
        and wm.workspace_id = public.my_workspace_id()
    )
  );

create or replace function public.setup_auth_email_exists(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_email))
  );
end;
$$;

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
  v_role text := 'admin';
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Your account already exists. Sign in and use Create organization to add another team.';
  end if;

  if exists (select 1 from public.profiles where username = lower(trim(p_username))) then
    raise exception 'Username already taken';
  end if;

  insert into public.workspaces (org_name)
  values (trim(p_org_name))
  returning * into v_workspace;

  insert into public.profiles (id, workspace_id, active_workspace_id, name, username, email, role, color, active, last_seen)
  values (
    auth.uid(),
    v_workspace.id,
    v_workspace.id,
    trim(p_name),
    lower(trim(p_username)),
    coalesce(trim(p_email), ''),
    v_role,
    '#3d7fe0',
    true,
    now()
  )
  returning * into v_profile;

  insert into public.workspace_members (user_id, workspace_id, role)
  values (auth.uid(), v_workspace.id, v_role)
  on conflict do nothing;

  insert into public.activity_log (workspace_id, actor_id, action, subject)
  values (v_workspace.id, v_profile.id, 'created the workspace', v_workspace.org_name);

  return jsonb_build_object(
    'orgName', v_workspace.org_name,
    'workspaceId', v_workspace.id,
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

create or replace function public.complete_user_setup(
  p_user_id uuid,
  p_org_name text,
  p_name text,
  p_username text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.workspaces;
  v_profile public.profiles;
  v_role text := 'admin';
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Profile already exists';
  end if;

  if exists (select 1 from public.profiles where username = lower(trim(p_username))) then
    raise exception 'Username already taken';
  end if;

  insert into public.workspaces (org_name)
  values (trim(p_org_name))
  returning * into v_workspace;

  insert into public.profiles (id, workspace_id, active_workspace_id, name, username, email, role, color, active, last_seen)
  values (
    p_user_id,
    v_workspace.id,
    v_workspace.id,
    trim(p_name),
    lower(trim(p_username)),
    coalesce(trim(p_email), ''),
    v_role,
    '#3d7fe0',
    true,
    now()
  )
  returning * into v_profile;

  insert into public.workspace_members (user_id, workspace_id, role)
  values (p_user_id, v_workspace.id, v_role)
  on conflict do nothing;

  insert into public.activity_log (workspace_id, actor_id, action, subject)
  values (v_workspace.id, v_profile.id, 'created the workspace', v_workspace.org_name);

  return jsonb_build_object(
    'orgName', v_workspace.org_name,
    'workspaceId', v_workspace.id,
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

create or replace function public.list_my_workspaces()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_active uuid;
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;

  select coalesce(active_workspace_id, workspace_id)
  into v_active
  from public.profiles
  where id = auth.uid();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', w.id,
          'orgName', w.org_name,
          'role', wm.role,
          'active', w.id = v_active
        )
        order by w.created_at asc
      )
      from public.workspace_members wm
      join public.workspaces w on w.id = wm.workspace_id
      where wm.user_id = auth.uid()
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.list_my_workspaces() to authenticated;

create or replace function public.switch_active_workspace(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.workspace_members;
  v_org text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_member
  from public.workspace_members
  where user_id = auth.uid()
    and workspace_id = p_workspace_id;

  if v_member.user_id is null then
    raise exception 'You do not have access to that organization';
  end if;

  update public.profiles
  set active_workspace_id = p_workspace_id
  where id = auth.uid();

  select org_name into v_org
  from public.workspaces
  where id = p_workspace_id;

  return jsonb_build_object(
    'workspaceId', p_workspace_id,
    'orgName', coalesce(v_org, 'Orbdyn Workspace'),
    'role', v_member.role
  );
end;
$$;

grant execute on function public.switch_active_workspace(uuid) to authenticated;

create or replace function public.create_organization(p_org_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.workspaces;
  v_profile public.profiles;
  v_role text := 'admin';
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if coalesce(trim(p_org_name), '') = '' then
    raise exception 'Organization name is required';
  end if;

  insert into public.workspaces (org_name)
  values (trim(p_org_name))
  returning * into v_workspace;

  insert into public.workspace_members (user_id, workspace_id, role)
  values (auth.uid(), v_workspace.id, v_role)
  on conflict do nothing;

  update public.profiles
  set active_workspace_id = v_workspace.id
  where id = auth.uid();

  insert into public.activity_log (workspace_id, actor_id, action, subject)
  values (v_workspace.id, auth.uid(), 'created the workspace', v_workspace.org_name);

  return jsonb_build_object(
    'workspaceId', v_workspace.id,
    'orgName', v_workspace.org_name,
    'role', v_role
  );
end;
$$;

grant execute on function public.create_organization(text) to authenticated;

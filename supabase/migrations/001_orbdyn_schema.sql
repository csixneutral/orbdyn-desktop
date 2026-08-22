-- Orbdyn Supabase schema (single workspace per project instance)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  org_name text not null default 'Orbdyn Workspace',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  username text not null unique,
  email text default '',
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  color text not null default '#3d7fe0',
  active boolean not null default true,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text default '',
  client text default '',
  colour text default '#3d7fe0',
  owner_id uuid references public.profiles(id),
  member_ids uuid[] not null default '{}',
  visibility text not null default 'everyone' check (visibility in ('everyone', 'members')),
  status text not null default 'active',
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ref text not null,
  title text not null,
  description text default '',
  project_id uuid references public.projects(id) on delete set null,
  assignee_ids uuid[] not null default '{}',
  created_by uuid references public.profiles(id),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done', 'blocked')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  progress smallint not null default 0 check (progress >= 0 and progress <= 100),
  due_date date,
  start_date date,
  estimate_hours numeric default 0,
  tags text[] not null default '{}',
  watcher_ids uuid[] not null default '{}',
  sort_order numeric not null default 0,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  file_id uuid,
  author_id uuid references public.profiles(id),
  body text not null check (char_length(body) <= 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  storage_path text not null,
  size bigint not null default 0,
  mime text default 'application/octet-stream',
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  note text default '',
  uploaded_by uuid references public.profiles(id),
  downloads integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  date date not null,
  end_date date,
  start_time text,
  end_time text,
  all_day boolean not null default false,
  location text default '',
  notes text default '',
  kind text not null default 'meeting',
  project_id uuid references public.projects(id) on delete set null,
  attendee_ids uuid[] not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'task',
  title text not null,
  body text default '',
  link jsonb,
  actor_id uuid references public.profiles(id),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  subject text not null,
  link jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.trash_items (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('user', 'project', 'task', 'file')),
  name text not null,
  data jsonb not null,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references public.profiles(id),
  deleted_by_name text
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.my_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.my_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Setup RPC (first admin after signUp)
-- ---------------------------------------------------------------------------

create or replace function public.setup_workspace(
  p_org_name text,
  p_name text,
  p_username text
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

  if exists (select 1 from public.profiles where username = lower(trim(p_username))) then
    raise exception 'Username already taken';
  end if;

  insert into public.workspaces (org_name)
  values (trim(p_org_name))
  returning * into v_workspace;

  insert into public.profiles (id, workspace_id, name, username, role, color, active, last_seen)
  values (
    auth.uid(),
    v_workspace.id,
    trim(p_name),
    lower(trim(p_username)),
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

grant execute on function public.setup_workspace(text, text, text) to authenticated;

create or replace function public.public_bootstrap()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_org text := 'Orbdyn Workspace';
begin
  select count(*) into v_count from public.workspaces;
  if v_count > 0 then
    select org_name into v_org from public.workspaces order by created_at asc limit 1;
  end if;
  return jsonb_build_object('setupNeeded', v_count = 0, 'orgName', v_org);
end;
$$;

grant execute on function public.public_bootstrap() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.files enable row level security;
alter table public.events enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;
alter table public.trash_items enable row level security;

create policy "workspace members read workspace"
  on public.workspaces for select
  using (id = public.my_workspace_id());

create policy "profiles in workspace"
  on public.profiles for select
  using (workspace_id = public.my_workspace_id());

create policy "profiles update self or admin"
  on public.profiles for update
  using (workspace_id = public.my_workspace_id() and (id = auth.uid() or public.my_role() = 'admin'));

create policy "projects workspace"
  on public.projects for all
  using (workspace_id = public.my_workspace_id())
  with check (workspace_id = public.my_workspace_id());

create policy "tasks workspace"
  on public.tasks for all
  using (workspace_id = public.my_workspace_id())
  with check (workspace_id = public.my_workspace_id());

create policy "comments workspace"
  on public.comments for all
  using (workspace_id = public.my_workspace_id())
  with check (workspace_id = public.my_workspace_id());

create policy "files workspace"
  on public.files for all
  using (workspace_id = public.my_workspace_id())
  with check (workspace_id = public.my_workspace_id());

create policy "events workspace"
  on public.events for all
  using (workspace_id = public.my_workspace_id())
  with check (workspace_id = public.my_workspace_id());

create policy "notifications own"
  on public.notifications for select using (user_id = auth.uid());
create policy "notifications update own"
  on public.notifications for update using (user_id = auth.uid());
create policy "notifications insert workspace"
  on public.notifications for insert with check (workspace_id = public.my_workspace_id());

create policy "activity workspace"
  on public.activity_log for all
  using (workspace_id = public.my_workspace_id())
  with check (workspace_id = public.my_workspace_id());

create policy "trash workspace"
  on public.trash_items for all
  using (workspace_id = public.my_workspace_id())
  with check (workspace_id = public.my_workspace_id());

-- ---------------------------------------------------------------------------
-- Storage bucket, policies, Realtime: see 002_storage_realtime.sql
-- ---------------------------------------------------------------------------

-- Storage bucket, policies, table grants, indexes, and Realtime

-- ---------------------------------------------------------------------------
-- Grants (Data API access for authenticated users)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_profiles_workspace on public.profiles (workspace_id);
create index if not exists idx_profiles_username on public.profiles (username);
create index if not exists idx_projects_workspace on public.projects (workspace_id);
create index if not exists idx_tasks_workspace on public.tasks (workspace_id);
create index if not exists idx_tasks_project on public.tasks (project_id);
create index if not exists idx_tasks_status on public.tasks (workspace_id, status);
create index if not exists idx_files_workspace on public.files (workspace_id);
create index if not exists idx_events_workspace on public.events (workspace_id);
create index if not exists idx_notifications_user on public.notifications (user_id, read);
create index if not exists idx_activity_workspace on public.activity_log (workspace_id, created_at desc);
create index if not exists idx_trash_workspace on public.trash_items (workspace_id, deleted_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger for tasks
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('workspace-files', 'workspace-files', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- ---------------------------------------------------------------------------
-- Storage policies (paths: {workspace_id}/... )
-- ---------------------------------------------------------------------------

create or replace function public.storage_in_my_workspace(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((storage.foldername(object_name))[1], '')
    = coalesce((select workspace_id::text from public.profiles where id = auth.uid() limit 1), '');
$$;

grant execute on function public.storage_in_my_workspace(text) to authenticated;

drop policy if exists "workspace files select" on storage.objects;
create policy "workspace files select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'workspace-files'
    and public.storage_in_my_workspace(name)
  );

drop policy if exists "workspace files insert" on storage.objects;
create policy "workspace files insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'workspace-files'
    and public.storage_in_my_workspace(name)
  );

drop policy if exists "workspace files update" on storage.objects;
create policy "workspace files update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'workspace-files'
    and public.storage_in_my_workspace(name)
  )
  with check (
    bucket_id = 'workspace-files'
    and public.storage_in_my_workspace(name)
  );

drop policy if exists "workspace files delete" on storage.objects;
create policy "workspace files delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'workspace-files'
    and public.storage_in_my_workspace(name)
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table public.profiles replica identity full;
alter table public.projects replica identity full;
alter table public.tasks replica identity full;
alter table public.comments replica identity full;
alter table public.files replica identity full;
alter table public.events replica identity full;
alter table public.notifications replica identity full;
alter table public.activity_log replica identity full;
alter table public.trash_items replica identity full;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'projects',
    'tasks',
    'comments',
    'files',
    'events',
    'notifications',
    'activity_log',
    'trash_items'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

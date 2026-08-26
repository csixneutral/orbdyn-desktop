-- Allow manager role in workspace_members and profiles.
-- Safe to run even if migration 013 was skipped (014 alone does not update constraints).

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.workspace_members drop constraint if exists workspace_members_role_check;

-- One-time legacy rename: old schema used member=create/edit, processor=tasks-only.
-- Only run when processor rows still exist (signals pre-013 schema).
do $$
begin
  if exists (select 1 from public.workspace_members where role = 'processor' limit 1) then
    update public.profiles set role = 'manager' where role = 'member';
    update public.profiles set role = 'member' where role = 'processor';
    update public.workspace_members set role = 'manager' where role = 'member';
    update public.workspace_members set role = 'member' where role = 'processor';
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'manager', 'member', 'viewer'));

alter table public.workspace_members
  add constraint workspace_members_role_check
  check (role in ('admin', 'manager', 'member', 'viewer'));

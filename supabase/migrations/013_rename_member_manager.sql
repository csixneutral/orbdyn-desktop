-- Rename roles: member -> manager, processor -> member

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.workspace_members drop constraint if exists workspace_members_role_check;

update public.profiles set role = 'manager' where role = 'member';
update public.profiles set role = 'member' where role = 'processor';

update public.workspace_members set role = 'manager' where role = 'member';
update public.workspace_members set role = 'member' where role = 'processor';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'manager', 'member', 'viewer'));

alter table public.workspace_members
  add constraint workspace_members_role_check
  check (role in ('admin', 'manager', 'member', 'viewer'));

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

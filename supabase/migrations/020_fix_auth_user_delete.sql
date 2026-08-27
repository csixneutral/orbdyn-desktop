-- Allow auth.users deletion by clearing profile references instead of blocking deletes.

alter table public.projects drop constraint if exists projects_owner_id_fkey;
alter table public.projects
  add constraint projects_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete set null;

alter table public.tasks drop constraint if exists tasks_created_by_fkey;
alter table public.tasks
  add constraint tasks_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.comments drop constraint if exists comments_author_id_fkey;
alter table public.comments
  add constraint comments_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete set null;

alter table public.files drop constraint if exists files_uploaded_by_fkey;
alter table public.files
  add constraint files_uploaded_by_fkey
  foreign key (uploaded_by) references public.profiles(id) on delete set null;

alter table public.events drop constraint if exists events_created_by_fkey;
alter table public.events
  add constraint events_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.notifications drop constraint if exists notifications_actor_id_fkey;
alter table public.notifications
  add constraint notifications_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

alter table public.activity_log drop constraint if exists activity_log_actor_id_fkey;
alter table public.activity_log
  add constraint activity_log_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

alter table public.trash_items drop constraint if exists trash_items_deleted_by_fkey;
alter table public.trash_items
  add constraint trash_items_deleted_by_fkey
  foreign key (deleted_by) references public.profiles(id) on delete set null;

drop function if exists public.purge_auth_user(uuid);

create or replace function public.purge_auth_user(p_user_id uuid, p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_count integer;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if not p_force then
    select count(*) into v_admin_count
    from public.workspace_members wm
    where wm.user_id = p_user_id
      and wm.role = 'admin'
      and (
        select count(*)
        from public.workspace_members admins
        where admins.workspace_id = wm.workspace_id
          and admins.role = 'admin'
      ) <= 1;

    if v_admin_count > 0 then
      raise exception 'Cannot delete the only administrator in an organization';
    end if;
  end if;

  delete from public.notifications where user_id = p_user_id;
  delete from public.workspace_members where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;

  if not found then
    raise exception 'Auth user not found';
  end if;

  return jsonb_build_object('ok', true, 'userId', p_user_id);
end;
$$;

revoke all on function public.purge_auth_user(uuid, boolean) from public;
grant execute on function public.purge_auth_user(uuid, boolean) to service_role;

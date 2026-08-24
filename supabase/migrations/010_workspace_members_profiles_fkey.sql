-- Link workspace_members to profiles so PostgREST can embed profile data

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspace_members_user_id_profiles_fkey'
  ) then
    alter table public.workspace_members
      add constraint workspace_members_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

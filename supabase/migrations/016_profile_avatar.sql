-- Profile photo support

alter table public.profiles
  add column if not exists avatar_url text not null default '';

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
          'avatar_url', p.avatar_url,
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

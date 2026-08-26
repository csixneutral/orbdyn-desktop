-- Auto-confirm auth users during registration (before profile exists).

create or replace function public.setup_confirm_auth_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Account already set up';
  end if;

  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Auth user not found';
  end if;

  return true;
end;
$$;

revoke all on function public.setup_confirm_auth_user(uuid) from public;
grant execute on function public.setup_confirm_auth_user(uuid) to anon, authenticated;

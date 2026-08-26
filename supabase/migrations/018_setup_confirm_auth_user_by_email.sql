-- Confirm bootstrap auth users by email during registration (before profile exists).

create or replace function public.setup_confirm_auth_user_by_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
begin
  if coalesce(trim(p_email), '') = '' then
    raise exception 'Email is required';
  end if;

  select id
  into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'Auth user not found';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Account already set up';
  end if;

  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = v_user_id;

  return true;
end;
$$;

revoke all on function public.setup_confirm_auth_user_by_email(text) from public;
grant execute on function public.setup_confirm_auth_user_by_email(text) to anon, authenticated;

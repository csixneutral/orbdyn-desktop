-- Resolve the Supabase Auth email for a username at login time (anon-safe)

create or replace function public.login_email_for_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile
  from public.profiles
  where username = lower(trim(p_username))
  limit 1;

  if v_profile.email is not null
    and trim(v_profile.email) <> ''
    and position('@' in v_profile.email) > 0 then
    return lower(trim(v_profile.email));
  end if;

  return lower(trim(p_username)) || '@orbdyn.local';
end;
$$;

grant execute on function public.login_email_for_username(text) to anon, authenticated;

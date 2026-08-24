-- Resolve login email from Supabase Auth (not the optional contact email on profiles)

create or replace function public.login_email_for_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = lower(trim(p_username))
  limit 1;

  if v_email is not null and trim(v_email) <> '' then
    return lower(trim(v_email));
  end if;

  return null;
end;
$$;

grant execute on function public.login_email_for_username(text) to anon, authenticated;

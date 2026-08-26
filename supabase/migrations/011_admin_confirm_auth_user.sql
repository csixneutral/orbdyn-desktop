-- Allow workspace admins to confirm auth emails for users they create via client signUp fallback.

create or replace function public.admin_confirm_auth_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.my_role() <> 'admin' then
    raise exception 'Administrator access required';
  end if;

  if p_user_id is null then
    raise exception 'User id is required';
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

grant execute on function public.admin_confirm_auth_user(uuid) to authenticated;

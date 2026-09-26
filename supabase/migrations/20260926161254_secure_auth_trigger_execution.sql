-- Phase 6-7A.3
-- Keep the auth.users profile-creation trigger operational,
-- while preventing direct execution of its SECURITY DEFINER function.

do $$
begin
  if to_regprocedure('public.handle_new_auth_user()') is not null then
    revoke execute on function public.handle_new_auth_user()
      from public, anon, authenticated, service_role;
  end if;
end
$$;

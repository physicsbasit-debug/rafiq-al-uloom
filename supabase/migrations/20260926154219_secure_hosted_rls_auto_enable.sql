-- Phase 6-7A
-- Keep Supabase's hosted ensure_rls event trigger operational,
-- but prevent direct RPC execution of its SECURITY DEFINER function.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable()
      from public, anon, authenticated;
  end if;
end
$$;

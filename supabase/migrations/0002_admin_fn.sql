-- ───────────────────────────────────────────────────────────────────
-- 0002_admin_fn.sql  —  is_admin() helper used by every RLS policy
-- ───────────────────────────────────────────────────────────────────

-- security definer:  function runs with the owner's privileges so it
--   can read admin_users without being blocked by RLS on that table.
-- stable:            the same input (auth.uid()) returns the same
--   output within a statement, so Postgres can cache the call.
-- set search_path:   hardens against search-path injection attacks
--   that target security-definer functions.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- Allow only authenticated callers to invoke. Anon cannot have
-- auth.uid() set anyway, but be explicit.
revoke execute on function public.is_admin() from public;
grant  execute on function public.is_admin() to authenticated;

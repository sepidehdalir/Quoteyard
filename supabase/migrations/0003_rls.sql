-- ───────────────────────────────────────────────────────────────────
-- 0003_rls.sql  —  Row Level Security policies
-- ───────────────────────────────────────────────────────────────────

alter table public.services    enable row level security;
alter table public.cities      enable row level security;
alter table public.admin_users enable row level security;
alter table public.leads       enable row level security;
alter table public.lead_notes  enable row level security;
alter table public.lead_files  enable row level security;

-- services: anon can read active rows for the public form;
--           only admins can write.
create policy "services: anon read active"
  on public.services for select
  to anon, authenticated
  using (is_active = true);

create policy "services: admin write"
  on public.services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- cities: same pattern as services.
create policy "cities: anon read active"
  on public.cities for select
  to anon, authenticated
  using (is_active = true);

create policy "cities: admin write"
  on public.cities for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- admin_users: admins can see who else is an admin.
--   Membership changes go through the SQL editor / service-role only.
--   No insert/update/delete policy = those operations are denied
--   for all roles except service_role (which bypasses RLS).
create policy "admin_users: admin read"
  on public.admin_users for select
  to authenticated
  using (public.is_admin());

-- leads: admin-only.
--   Public form submissions are inserted by the Server Action via
--   the service-role client, which bypasses RLS. Direct anon writes
--   are blocked here.
create policy "leads: admin all"
  on public.leads for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- lead_notes: admin-only.
create policy "lead_notes: admin all"
  on public.lead_notes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- lead_files: admin-only via the dashboard.
--   Public-form uploads are inserted by the Server Action via the
--   service-role client.
create policy "lead_files: admin all"
  on public.lead_files for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

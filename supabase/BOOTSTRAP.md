# Bootstrapping the First Admin

After Phase 4 (admin authentication), grant admin rights to the first
account exactly once. Run in the Supabase SQL Editor:

```sql
insert into public.admin_users (user_id, email, full_name)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
from auth.users
where email = 'replace-with-your-email@example.com'
on conflict (user_id) do nothing;
```

Verify:

```sql
select * from public.admin_users;
```

Subsequent admins are added the same way until a future
"manage admins" UI lands (out of scope for the current build).

## Why this is a manual step

The `admin_users` table cannot be self-bootstrapped through normal RLS
because the `is_admin()` check (which guards `admin_users` writes
through RLS) would fail before any admin exists. Granting the first
admin requires bypassing RLS, which is what the SQL editor does
(it uses the `service_role`). After the first admin exists, the
admin can grant others through the same flow until a UI is built.

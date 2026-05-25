# Production Deployment Checklist

End-to-end playbook for shipping the QuoteYard app to Vercel
backed by a real Supabase project, Upstash Redis, and Resend.

Estimated time end-to-end: 60-90 minutes.

---

## 1. Supabase setup

### 1.1 Create the project

1. Sign in at https://supabase.com -> **New project**
2. Name: `quoteyard-prod` (or whatever you prefer)
3. Region: closest to your users. For Vancouver: **West US (Oregon)**
   or **Canada (Central)** if available
4. Generate a strong database password and store it in your
   password manager
5. Wait ~2 minutes for provisioning

### 1.2 Apply the schema

In **SQL Editor -> New query**, run each migration in order:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_admin_fn.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/migrations/0004_seed.sql`
5. `supabase/migrations/0005_storage.sql`

Each should report "Success".

### 1.3 Verify RLS

In SQL Editor:

```sql
-- Every public-schema table should have rowsecurity = true.
select tablename, rowsecurity
from   pg_tables
where  schemaname = 'public'
order by tablename;
```

Expected output:

| tablename     | rowsecurity |
|---------------|-------------|
| admin_users   | t           |
| cities        | t           |
| lead_files    | t           |
| lead_notes    | t           |
| leads         | t           |
| services      | t           |

Then confirm the policies exist:

```sql
select schemaname, tablename, policyname, roles
from   pg_policies
where  schemaname = 'public'
order by tablename, policyname;
```

You should see exactly the policies from `0003_rls.sql`.

Confirm the `is_admin()` function exists and is hardened:

```sql
select proname, prosecdef, proconfig
from   pg_proc
where  proname = 'is_admin' and pronamespace = 'public'::regnamespace;
```

`prosecdef` must be `t`; `proconfig` must contain `search_path=public`.

### 1.4 Verify the storage bucket

**Storage -> Buckets** in the Supabase dashboard:

- `lead-files` exists
- Public: **No** (private)
- File size limit: 10485760 (10 MB)
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/heic`

### 1.5 Copy keys

From **Project Settings -> API**, copy:

| Supabase value      | Env var                          |
|---------------------|----------------------------------|
| Project URL         | `NEXT_PUBLIC_SUPABASE_URL`       |
| `anon public` key   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  |
| `service_role` key  | `SUPABASE_SERVICE_ROLE_KEY`      |

The service-role key bypasses RLS. Never expose it anywhere
except Vercel's encrypted env-var store.

---

## 2. Resend setup

1. Sign up at https://resend.com
2. **Domains -> Add domain** with your sending domain (e.g. `mail.yourcompany.com`)
3. Add the DNS records Resend gives you (SPF + DKIM + DMARC)
4. Wait for verification (~minutes)
5. **API Keys -> Create API key** with `Sending` permission
6. Capture the values:

| Resend value           | Env var                    |
|------------------------|----------------------------|
| API key                | `RESEND_API_KEY`           |
| From (verified domain) | `RESEND_FROM_EMAIL`        |
| Your inbox             | `ADMIN_NOTIFICATION_EMAIL` |

`RESEND_FROM_EMAIL` format: `QuoteYard <leads@yourdomain.com>`

For testing without a verified domain, use the dev sender
`onboarding@resend.dev` -- it only sends to the email tied to
your Resend account.

---

## 3. Upstash Redis setup

1. Sign up at https://upstash.com (free tier is enough)
2. **Create database**:
   - Type: **Global** (cheap, low-latency from any Vercel region)
   - Region: nearest your Vercel deployment region
   - Eviction: leave default
3. From the database page, copy:

| Upstash value       | Env var                     |
|---------------------|-----------------------------|
| REST URL            | `UPSTASH_REDIS_REST_URL`    |
| REST Token          | `UPSTASH_REDIS_REST_TOKEN`  |

Without these the app falls back to an in-memory limiter, which
is useless on Vercel (cold starts reset state, regions don't
share memory). The rate-limit module logs a loud warning if it
ever falls back in production -- watch for
`[rate-limit] UPSTASH_REDIS_REST_URL not set in production` in
Vercel logs.

---

## 4. Vercel deployment

### 4.1 Create the project

1. Push your repo to GitHub
2. https://vercel.com -> **Add new -> Project**
3. Import the repo
4. Framework preset: **Next.js** (auto-detected)
5. Root directory: leave default
6. Build command: leave default (`next build`)

### 4.2 Configure env vars

Vercel project -> **Settings -> Environment Variables**. Add the
following with scope `Production` (and `Preview` if you want
previews to work against the same backend; otherwise leave Preview
unset and previews will simply not have the backend):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET = lead-files

RESEND_API_KEY
RESEND_FROM_EMAIL
ADMIN_NOTIFICATION_EMAIL

UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

NEXT_PUBLIC_APP_URL = https://your-domain.vercel.app
```

Critical:

- **`NEXT_PUBLIC_APP_URL` must match the live domain.** Used for
  the `<a href="View in dashboard">` link in admin emails, OG
  metadata, and CSRF Origin checks on Server Actions.
- **`SUPABASE_SERVICE_ROLE_KEY` must NOT have a `NEXT_PUBLIC_`
  prefix.** Anything with `NEXT_PUBLIC_` is inlined into the
  client bundle.

### 4.3 Deploy

Hit **Deploy**. First build typically takes 60-120 seconds.

### 4.4 Add a custom domain (optional)

Vercel project -> **Domains -> Add**. Update the
`NEXT_PUBLIC_APP_URL` env var to match, then redeploy.

---

## 5. Bootstrap the first admin

The `admin_users` table is empty after the migrations. Nobody can
access the dashboard until one row is added.

### 5.1 Create the auth user

Supabase **Authentication -> Users -> Add user**. Use a real
email and a strong password.

### 5.2 Grant admin via SQL

Supabase SQL Editor:

```sql
insert into public.admin_users (user_id, email, full_name)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
from auth.users
where email = 'your-email@example.com'
on conflict (user_id) do nothing;
```

Verify:

```sql
select * from public.admin_users;
```

### 5.3 Test login

Visit `https://your-domain.vercel.app/login` and sign in. You
should land on `/dashboard`.

---

## 6. Smoke tests on production

| # | Action | Expected |
|---|---|---|
| 1 | Visit `/dashboard` while signed out | Redirects to `/login` |
| 2 | Visit `/quote` | Form renders, service + city dropdowns populated |
| 3 | Submit a quote (with photos) | Redirects to `/thank-you?id=<uuid>` |
| 4 | Check `ADMIN_NOTIFICATION_EMAIL` inbox | Receives "New lead..." email within 10s |
| 5 | Storage **lead-files** bucket | New folder `leads/<uuid>/` with the uploaded photos |
| 6 | Log in, visit `/dashboard` | Lead list shows the submission |
| 7 | Click the lead | Detail page shows contact card, description, and the photos in the gallery |
| 8 | Click a photo | Opens full-size in a new tab |
| 9 | Wait 11 minutes, refresh the dashboard, click the same photo URL from the previous tab | URL is expired (Supabase returns 400) -- the dashboard page re-rendered with fresh URLs |
| 10 | Click **Export CSV** | Downloads `leads-YYYY-MM-DD.csv`; opens cleanly in Excel; no file URLs in the data |
| 11 | Submit 6 quotes from the same IP within an hour | 6th rejected with "Too many submissions..." |

---

## 7. Production hardening (recommended follow-ups)

These are NOT blockers for portfolio launch, but worth noting as
future improvements:

- **Orphaned-file garbage collector** — see `docs/orphaned-files.md`.
  Add a Supabase Edge Function cron to sweep the bucket daily.
- **Audit log for admin mutations** — log every status update and
  note delete to a separate `audit_log` table.
- **Multi-role admin** — owner vs sales-rep vs read-only.
- **Email retry queue** — if Resend is down, queue the
  notification and retry instead of just logging.
- **Trigram index for search** — `create extension pg_trgm` plus
  a GIN index on `full_name`/`email`/`phone`.
- **MFA on Supabase Auth** — Supabase ships it; just turn it on.

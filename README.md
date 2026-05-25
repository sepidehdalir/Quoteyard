<p align="left">
  <img src="public/brand/lockup/lockup-light.svg" alt="QuoteYard" height="80" />
</p>

# QuoteYard — Lead & Quote Management for Contractors

A full-stack SaaS-style lead and quote management dashboard for contractors and home-improvement businesses. Customers submit quote requests through a public form with photos; admins review submissions, update status, and add internal notes through a private dashboard.

Built as a portfolio demonstration of production full-stack engineering with a focus on security, type safety, and deployment hygiene.

---

## Live demo

- **Public quote form:** https://quoteyard.app/quote
- **Admin dashboard:** https://quoteyard.app/login (demo credentials available on request)

> Replace these URLs with your deployed URLs. Adding demo credentials in the README is reasonable for a portfolio site as long as the demo data contains no real PII.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (`strict + noUncheckedIndexedAccess + noImplicitOverride`) |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| File storage | Supabase Storage (private bucket, signed URLs) |
| Email | Resend |
| Rate limiting | Upstash Redis |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel |

---

## Features

### Public-facing
- Quote request form with React Hook Form + Zod validation (client and server)
- Optional photo uploads (up to 5 files, 25 MB total)
- Server-side rate limiting (5 submissions per hour, 20 per day)
- Honeypot anti-spam field
- Magic-byte file validation
- Confirmation page with a reference ID

### Admin dashboard
- Email/password login (Supabase Auth, gated by `admin_users` membership)
- Paginated lead list with search and filters (status, service, city, date range)
- Per-lead detail page with contact info, project description, photo gallery, and internal notes
- Inline status updates and note add/delete
- CSV export (admin-gated, RFC 4180, formula-injection prevention)
- Signed-URL photo gallery (10-minute expiry, never persisted)

### Operational
- Email notifications via Resend when a new lead arrives
- Defense in depth: edge gate (Next.js proxy) -> page layout -> Server Action -> Postgres RLS
- Synchronous best-effort cleanup for orphaned files
- Production deployment playbook (`docs/deployment.md`)

---

## Security architecture

The project uses a *defense-in-depth* model: every sensitive request passes through several independent gates, any one of which is sufficient to reject the request.

```
+-------------------------------------------------------------+
|                  Request to /dashboard/*                    |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  Gate 1: src/proxy.ts  (Next.js edge, before any RSC)       |
|    - No session            -> /login                        |
|    - Session but not admin -> /login?error=not_authorized   |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  Gate 2: dashboard/layout.tsx  (Server Component)           |
|    - getCurrentAdmin() returns null -> /login               |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  Gate 3: Server Action  (per-mutation check)                |
|    - getCurrentAdmin() before any DB write                  |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  Gate 4: Postgres RLS  (database, every query)              |
|    - is_admin() must succeed for any leads/notes/files row  |
+-------------------------------------------------------------+
```

Removing any single gate would still leave a working secure system.

### Key controls

| Concern | Implementation |
|---|---|
| Server-only secrets | `import 'server-only'` on every module that touches `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `UPSTASH_REDIS_*`. Build fails if a client component imports them. |
| CSRF | Next.js Server Actions enforce Origin matches Host by default in 15+. |
| Account enumeration | Login returns the identical error string for "wrong password", "no such user", and "authenticated but not in admin_users". |
| SQL/PostgREST injection | Zod validation server-side. Search input passes a strict allow-list regex before being interpolated into a PostgREST `.or()` clause. |
| File upload | 5 layers: client MIME `accept`, server allow-list, server magic-byte verification, Supabase Storage bucket-level MIME + size limits, Postgres `lead_files.size_bytes` CHECK constraint. |
| Storage path safety | `leads/{uuid}/{uuid}.{ext}` -- user-supplied filename never appears in the storage object key. |
| Private bucket | The `lead-files` bucket is private. Photos surface in the dashboard via short-lived signed URLs (10 min) generated server-side per render. |
| Email header injection | Subject sanitization strips C0 controls + DEL and caps at 200 chars. |
| CSV injection | Cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` are prefixed with `'` to disable formula interpretation in Excel. |
| Rate limiting | Upstash Redis sliding window, 5/hr + 20/day per IP. Runs *before* validation so the validation path isn't an oracle. |
| Orphaned files | Synchronous best-effort cleanup when metadata insert fails after upload. Production playbook documents a periodic GC for the residual case. |

---

## Database and Row Level Security

Schema lives in `supabase/migrations/`. Five migrations applied in order:

1. **`0001_schema.sql`** -- six tables: `services`, `cities`, `admin_users`, `leads`, `lead_notes`, `lead_files`. A `lead_status` enum (`new`/`contacted`/`quoted`/`won`/`lost`).
2. **`0002_admin_fn.sql`** -- the `is_admin()` SQL function: `security definer`, `stable`, `set search_path = public`, execute revoked from public, granted only to authenticated.
3. **`0003_rls.sql`** -- RLS enabled on every table. Anon can read active `services` and `cities` only. Every admin operation requires `is_admin()`. Service-role (used by Server Actions) bypasses RLS by design.
4. **`0004_seed.sql`** -- 6 services, 12 Metro Vancouver cities.
5. **`0005_storage.sql`** -- private `lead-files` Storage bucket with 10 MB cap and MIME allow-list.

Verification queries are in `docs/deployment.md` -- they confirm `rowsecurity = true` on every public table, the expected policies exist, and `is_admin()` is hardened.

---

## Local setup

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project (free tier is fine for local dev)

### Steps

```bash
git clone <repo-url>
cd quoteyard
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# and SUPABASE_SERVICE_ROLE_KEY at minimum.
```

Apply migrations in the Supabase SQL Editor in the order listed
above.

Create one admin via the Supabase Auth UI, then bootstrap them:

```sql
insert into public.admin_users (user_id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
from auth.users
where email = 'your-email@example.com';
```

Then:

```bash
npm run dev
# Open http://localhost:3000
# Submit a quote at /quote
# Sign in at /login
# View leads at /dashboard
```

Resend and Upstash are optional locally. Without them:

- Resend: email notifications are logged and skipped (no `RESEND_API_KEY` warning).
- Upstash: rate limiter falls back to in-memory (fine for dev; useless on Vercel).

---

## Deployment

Full production playbook in `docs/deployment.md`. Summary:

1. **Supabase** -- create project, apply migrations, verify RLS.
2. **Resend** -- verify a sending domain, create API key.
3. **Upstash Redis** -- create a Global database.
4. **Vercel** -- import the repo, set env vars, deploy.
5. **Bootstrap** -- add the first admin via SQL.
6. **Smoke test** -- run the 11-step checklist from the deployment doc.

---

## Future improvements

These were intentionally left out of the initial build to keep the scope focused, but they're the obvious next steps:

- **Audit log** of admin mutations (status changes, note deletes) for compliance and accountability.
- **Multi-role admins** -- owner, sales rep, read-only.
- **Email retry queue** -- if Resend is down, queue the notification and retry instead of just logging.
- **Trigram index** for full-text search on `full_name`/`email`/`phone` once dataset size warrants it.
- **Orphaned-file GC** as a Supabase Edge Function cron (`docs/orphaned-files.md` has the design).
- **MFA** -- Supabase Auth supports TOTP; turn it on in production.
- **Customer-facing status page** -- a tokenized URL the customer can use to check progress without an account.
- **Estimate workflow** -- a real quote builder rather than a single `estimated_quote_cents` column.

---

## Project structure

```
src/
├── app/
│   ├── (public)/
│   │   ├── quote/                 -- public quote form + Server Action
│   │   └── thank-you/             -- confirmation page
│   └── (admin)/
│       ├── login/                 -- Supabase Auth login
│       └── dashboard/
│           ├── leads/[id]/        -- detail page, photo gallery, notes
│           └── export/leads.csv/  -- CSV Route Handler
├── components/
│   └── dashboard/                 -- table, filters, pagination, status badge
├── lib/
│   ├── supabase/                  -- typed clients (browser, server, admin, auth, middleware)
│   ├── queries/                   -- typed Server-Component query functions
│   ├── validations/               -- Zod schemas
│   ├── files/                     -- magic-bytes, storage, signed URLs
│   ├── rate-limit/                -- Upstash + in-memory fallback
│   ├── email/                     -- Resend
│   └── leads/                     -- status display config
├── proxy.ts                       -- Next.js 16 edge proxy (admin gate)
└── types/database.ts              -- Supabase generated types

supabase/migrations/               -- 5 SQL migrations
docs/                              -- deployment.md, orphaned-files.md
```

---

## Author

Built by [your name] as a portfolio project for Junior Full-Stack Developer roles.

Source code is available on GitHub: [repo link].

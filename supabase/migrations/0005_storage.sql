-- ───────────────────────────────────────────────────────────────────
-- 0005_storage.sql  --  Lead-files Storage bucket
-- ───────────────────────────────────────────────────────────────────
--
-- Creates a private storage bucket for customer photo uploads.
--
-- Why private:
--   - The form is public, so anon must NOT be able to list bucket
--     contents (that would enumerate every lead's photos).
--   - The dashboard reads files via the service-role client, which
--     bypasses bucket RLS by design.
--   - When we surface photos in the dashboard UI (later phase),
--     we'll generate short-lived signed URLs per file.
--
-- Why no storage.objects RLS policies:
--   - All writes happen via service-role (bypasses RLS).
--   - All reads happen via signed URLs (which don't go through RLS).
--   - Anon role must therefore have NO storage.objects access on
--     this bucket. The default ('public = false') buckets give
--     exactly that, since no policies => no access for non-service
--     roles. We're explicit about it here for documentation.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-files',
  'lead-files',
  false,                                         -- private bucket
  10485760,                                      -- 10 MB per file (matches lead_files check constraint)
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

# Orphaned File Cleanup Strategy

## What's an orphan?

An object in the `lead-files` Supabase Storage bucket whose
`storage_path` is **not** referenced by any row in
`public.lead_files`.

## Where orphans come from

The `/quote` Server Action performs two operations in sequence:

1. Upload N files to Storage (`uploadLeadFiles`).
2. Insert N rows into `lead_files`.

If step 2 fails after step 1 succeeded, the bucket has files no
database row points to. Same situation if the action process
crashes between the two operations.

## Phase 6 mitigation — synchronous best-effort cleanup

When step 2 fails, the action calls `deleteLeadFiles()` to remove
the just-uploaded objects. This handles ~99% of real-world cases:
the metadata insert and the cleanup share infrastructure, so if
one is working the other usually is too.

Best-effort means we try once. If `deleteLeadFiles` itself fails
(rare — would require Storage to be intermittently broken), the
objects are truly orphaned. The action logs loudly:

    [deleteLeadFiles] cleanup failed -- orphaned files { paths, message }

## Production garbage collector — recommended

For the portfolio-final Vercel deploy, add a periodic job that
sweeps the bucket:

1. **Where:** a Supabase Edge Function or Vercel cron, depending
   on which side you want to own the schedule.
2. **How often:** daily is plenty for this scale.
3. **Logic:**
   ```sql
   -- pseudocode
   for each object in storage.objects WHERE bucket_id = 'lead-files'
     AND created_at < now() - interval '1 hour':       -- only orphans older than 1h
       if not exists (
         select 1 from public.lead_files
          where storage_path = object.name
       ):
         delete the object
   ```
4. **The 1-hour grace window** prevents the GC from racing with
   an in-flight submission whose metadata insert just hasn't
   landed yet.

This is **not implemented in Phase 6** — out of scope, and the
synchronous cleanup handles the realistic failure modes. The note
exists so the production deploy can add the GC in ~30 minutes of
work when traffic justifies it.

## Monitoring

Watch for the grep pattern `cleanup failed -- orphaned files` in
your server logs. If it ever fires, run a one-off manual sweep
(same logic as above, manually invoked from the Supabase SQL
editor against `storage.objects`).

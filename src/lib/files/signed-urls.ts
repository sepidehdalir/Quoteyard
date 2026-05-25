import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'lead-files';

/**
 * Default expiry for dashboard photo signed URLs. 10 minutes is
 * enough to view + download, short enough that a URL leaked from
 * a screenshot is useless within an hour.
 */
const DEFAULT_SIGNED_URL_TTL_SECONDS = 600;

/**
 * Generate signed URLs for a batch of storage paths.
 *
 * Returns a map of `path -> url`. Paths that fail to sign (e.g.
 * the object was deleted but the lead_files row still references
 * it) are omitted from the map; the caller renders a placeholder.
 *
 * The URL is generated server-side per render. It is NEVER:
 *   - stored in the database
 *   - logged
 *   - written to a long-lived cache
 *   - returned to anon callers
 *
 * The dashboard page is dynamic, so each render gets fresh URLs.
 */
export async function getSignedUrlsForPaths(
  paths: ReadonlyArray<string>,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrls([...paths], ttlSeconds);

  if (error) {
    console.error('[getSignedUrlsForPaths]', {
      message: error.message,
    });
    return result;
  }

  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) {
      result.set(entry.path, entry.signedUrl);
    }
  }
  return result;
}

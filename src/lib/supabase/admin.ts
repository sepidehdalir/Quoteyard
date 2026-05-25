import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Service-role Supabase client. Bypasses RLS.
 *
 * Use only for:
 *  - Inserting public quote submissions (after Zod validation + spam checks)
 *  - Inserting files uploaded with quote submissions
 *  - Maintenance scripts
 *
 * Never import from a client component. The `server-only` import will
 * crash the build if anything in the client bundle pulls this in.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

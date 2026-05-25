'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Sign the current admin out and bounce to /login.
 *
 * Supabase's signOut() invalidates the JWT on the server, clears
 * the auth cookie via the cookie adapter wired in
 * createSupabaseServerClient, and the redirect ensures any cached
 * Server Component state from /dashboard isn't replayed.
 */
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations/auth';
import type { ActionResult } from '@/lib/result';

export type LoginResult = ActionResult<never>;

/**
 * Server Action: sign in with Supabase Auth, then verify the user
 * is in `admin_users` before granting dashboard access.
 *
 *   1. Zod validate
 *   2. signInWithPassword against Supabase Auth
 *   3. On success, check membership via the same auth session that
 *      Supabase just established (RLS on admin_users gates this
 *      read to admins only, so a non-admin's auth.users row will
 *      authenticate but the admin_users lookup returns null)
 *   4. Non-admin: immediately sign out + return generic error so we
 *      don't leak that the email exists in auth.users
 *   5. Admin: redirect to /dashboard
 *
 * Errors are returned as a single `formError` string. We never
 * distinguish "no such email" from "wrong password" from "not an
 * admin" — same response for all of them so an attacker can't
 * enumerate accounts.
 */
export async function signIn(
  _prev: LoginResult | null,
  formData: FormData,
): Promise<LoginResult> {
  const raw = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors;
    const fieldErrors: Record<string, string[]> = {};
    for (const [field, msgs] of Object.entries(flat)) {
      if (msgs && msgs.length > 0) fieldErrors[field] = msgs;
    }
    return {
      ok: false,
      formError: 'Please correct the highlighted fields.',
      fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  // 1. Authenticate
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

  if (signInError || !signInData.user) {
    return {
      ok: false,
      formError: 'Invalid email or password.',
    };
  }

  // 2. Verify admin membership using the session we just created.
  //    RLS on admin_users (policy "admin_users: admin read") returns
  //    the row only if is_admin() succeeds — i.e. if the caller is
  //    listed in admin_users themselves. Non-admins get no row.
  const { data: adminRow, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', signInData.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    // Authenticated but not an admin. Sign them out so the auth
    // cookie doesn't linger, then return the same generic error.
    await supabase.auth.signOut();
    return {
      ok: false,
      formError: 'Invalid email or password.',
    };
  }

  // 3. Success — redirect to /dashboard (throws internally).
  redirect('/dashboard');
}

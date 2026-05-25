import 'server-only';
import { createSupabaseServerClient } from './server';

export interface AdminProfile {
  userId: string;
  email: string;
  fullName: string | null;
}

/**
 * Returns the current admin's profile, or null if the request is
 * unauthenticated or the user is not in `admin_users`.
 *
 * Use in admin route Server Components / Server Actions to gate access.
 * The `admin_users` row is read under RLS — non-admins get null.
 */
export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    email: data.email,
    fullName: data.full_name,
  };
}

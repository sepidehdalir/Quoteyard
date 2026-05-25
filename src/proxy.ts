import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { updateSession } from '@/lib/supabase/middleware';
import type { Database } from '@/types/database';

/**
 * Next.js 16 proxy (the renamed middleware convention).
 *
 * Two jobs:
 *   1. Refresh the Supabase auth session on every matched request
 *      (via updateSession). Required so Server Components see a
 *      live session.
 *   2. Gate /dashboard at the edge:
 *        - no Supabase session              → /login
 *        - session but not in admin_users   → /login?error=not_authorized
 *
 * The dashboard layout (src/app/(admin)/dashboard/layout.tsx) is a
 * second independent gate — defense in depth. Either alone is
 * sufficient; we keep both so a bug in one doesn't open a hole.
 */
export async function proxy(request: NextRequest) {
  // 1. Always refresh the session cookie (also gives us a response
  //    object whose cookies are correctly carried forward).
  const sessionResponse = await updateSession(request);

  // 2. Only enforce the admin gate on /dashboard paths.
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/dashboard')) {
    return sessionResponse;
  }

  // Build a fresh Supabase client bound to the cookies on the
  // (already-refreshed) request. We don't write cookies here — just
  // read auth.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op: cookie writes happened inside updateSession.
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo(request, '/login');
  }

  // RLS on admin_users only returns the row if is_admin() succeeds.
  // Non-admins get null here even though they're authenticated.
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminRow) {
    return redirectTo(request, '/login?error=not_authorized');
  }

  return sessionResponse;
}

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  const [pathname, search] = path.split('?');
  url.pathname = pathname ?? '/';
  url.search = search ? `?${search}` : '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match every request path except:
     *  - _next/static, _next/image, favicon
     *  - static image files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getCurrentAdmin } from '@/lib/supabase/auth';
import { BrandMark } from '@/components/brand';
import { LogoutForm } from './logout-form';

/**
 * Dashboard layout. Second line of admin defense (the proxy is the
 * first — see src/proxy.ts). Even if a request slipped past the
 * proxy, the layout independently calls getCurrentAdmin(); a null
 * result bounces to /login.
 *
 * This pattern is the App Router equivalent of "auth middleware
 * decorator + per-controller guard": both have to agree.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentAdmin();
  if (!me) redirect('/login?error=session_expired');

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900"
            >
              <BrandMark size={28} />
              QuoteYard
            </Link>
            <span className="hidden text-xs text-slate-400 sm:inline">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {me.fullName ?? me.email}
            </span>
            <LogoutForm />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

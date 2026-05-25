import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentAdmin } from '@/lib/supabase/auth';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Admin Login',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  // Already an admin? Skip the login form entirely.
  const me = await getCurrentAdmin();
  if (me) redirect('/dashboard');

  const { error } = await searchParams;
  const notice =
    error === 'not_authorized'
      ? 'Your account does not have dashboard access.'
      : error === 'session_expired'
        ? 'Your session has expired. Please sign in again.'
        : null;

  return (
    <section>
      <div className="mx-auto w-full max-w-md px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Admin Login
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Restricted to authorized staff.
        </p>

        {notice && (
          <div
            role="status"
            className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {notice}
          </div>
        )}

        <LoginForm />
      </div>
    </section>
  );
}

import type { Metadata } from 'next';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { QuoteForm } from './quote-form';

export const metadata: Metadata = {
  title: 'Request a Quote',
  description:
    'Submit a contractor quote request in minutes. Tell us about your ' +
    'project, attach photos, and a team member will respond with an estimate.',
  alternates: { canonical: '/quote' },
  openGraph: {
    url: '/quote',
    title: 'Request a Quote | QuoteYard',
    description:
      'Submit a contractor quote request in minutes. Tell us about your ' +
      'project and a team member will respond with an estimate.',
  },
};

export default async function QuotePage() {
  const supabase = await createSupabaseServerClient();

  // Both reads are anon-scoped via RLS (services.is_active = true,
  // cities.is_active = true) — see supabase/migrations/0003_rls.sql.
  const [servicesResult, citiesResult] = await Promise.all([
    supabase
      .from('services')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('cities')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  const services = servicesResult.data ?? [];
  const cities = citiesResult.data ?? [];

  return (
    <section>
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Quote request
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Tell us about your project
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          We respond to most requests within one business day. The more detail
          you share now, the more accurate the estimate.
        </p>

        <QuoteForm services={services} cities={cities} />
      </div>
    </section>
  );
}

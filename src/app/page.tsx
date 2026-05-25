import type { Metadata } from 'next';
import Link from 'next/link';

import { BrandMark } from '@/components/brand';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'QuoteYard — Lead & Quote Management for Contractors',
  description:
    'QuoteYard is a private dashboard for contractors and home-improvement ' +
    'businesses to capture quote requests, manage leads, and track jobs ' +
    'from first contact to signed estimate.',
  alternates: { canonical: '/' },
  openGraph: {
    url: appUrl,
    title: 'QuoteYard — Lead & Quote Management for Contractors',
    description:
      'Capture quote requests, manage leads, and track jobs in one private ' +
      'dashboard. Built for contractors and trades businesses.',
  },
};

/**
 * JSON-LD structured data describing QuoteYard as a WebApplication.
 *
 * I deliberately do NOT include:
 *   - aggregateRating / reviews (would be fake — this is a portfolio demo)
 *   - offers with priceCurrency (no real pricing)
 *   - Organization with founder / address (no real company)
 *
 * What's here is honest: a web application in the BusinessApplication
 * category, with name, description, URL, and the tech behind it. Google
 * understands this schema and will use it for richer search results
 * without us claiming things we can't back up.
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'QuoteYard',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Lead and quote management platform for contractors and home-improvement ' +
    'businesses. Capture quote requests, manage leads, and track jobs.',
  url: appUrl,
  inLanguage: 'en',
} as const;

export default function HomePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900"
          >
            <BrandMark size={28} />
            QuoteYard
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Lead &amp; quote management
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            A clean home for every quote.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            QuoteYard is a private dashboard for contractors and trades
            businesses. Capture quote requests through a public form, manage
            leads end to end, and keep every job moving — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="inline-flex h-12 items-center justify-center rounded-md bg-slate-900 px-6 text-base font-medium text-white transition-colors hover:bg-slate-800"
            >
              Request a quote
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-base font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              Admin sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            What QuoteYard does
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Built on a modern stack
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            QuoteYard is a portfolio-quality demonstration of a production
            full-stack web application. Next.js App Router, TypeScript in
            strict mode, Supabase Postgres with Row Level Security, signed
            URLs for private file storage, server-side rate limiting, and a
            defense-in-depth admin gate.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {STACK.map((tech) => (
              <li
                key={tech}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                {tech}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} QuoteYard</span>
          <span>Portfolio project · Built with Next.js &amp; Supabase</span>
        </div>
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    title: 'Public quote intake',
    body: 'A clean public form captures the customer’s contact details, project description, and photos. Rate limited and validated server-side.',
  },
  {
    title: 'Private lead dashboard',
    body: 'Filter, search, and paginate leads. Update status, attach internal notes, and review uploaded photos behind signed URLs.',
  },
  {
    title: 'CSV export',
    body: 'Export the current filtered view to CSV. Formula-injection safe and admin-gated.',
  },
  {
    title: 'Email notifications',
    body: 'Every new lead triggers an email to the admin inbox so nothing falls through the cracks.',
  },
  {
    title: 'Row Level Security',
    body: 'Supabase RLS policies enforce admin-only access at the database layer, independent of the application gate.',
  },
  {
    title: 'Production deployment',
    body: 'Designed for Vercel with Supabase, Resend, and Upstash. Documented playbook covers env vars, RLS verification, and the smoke test.',
  },
] as const;

const STACK = [
  'Next.js 16',
  'TypeScript',
  'Supabase',
  'PostgreSQL',
  'Tailwind CSS v4',
  'Resend',
  'Upstash Redis',
  'Vercel',
] as const;

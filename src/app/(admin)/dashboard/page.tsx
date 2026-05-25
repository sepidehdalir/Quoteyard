import type { Metadata } from 'next';
import Link from 'next/link';

import {
  listLeads,
  listServiceOptions,
  listCityOptions,
} from '@/lib/queries/leads';
import { parseLeadFilters } from '@/lib/validations/lead-filters';
import { LeadTable } from '@/components/dashboard/lead-table';
import { LeadFiltersBar } from '@/components/dashboard/lead-filters';
import { Pagination } from '@/components/dashboard/pagination';

export const metadata: Metadata = {
  title: 'Leads',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = parseLeadFilters(raw);
  const pageRaw = Array.isArray(raw.page) ? raw.page[0] : raw.page;
  const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10) || 1) : 1;

  const [{ leads, total, totalPages }, services, cities] = await Promise.all([
    listLeads(filters, { page }),
    listServiceOptions(),
    listCityOptions(),
  ]);

  // Build CSV-export href that carries the current filters but
  // drops `page` (CSV is not paginated).
  const exportQs = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'page' || v === undefined) continue;
    const single = Array.isArray(v) ? v[0] : v;
    if (typeof single === 'string' && single.length > 0)
      exportQs.set(k, single);
  }
  const exportHref = `/dashboard/export/leads.csv${exportQs.toString() ? `?${exportQs}` : ''}`;

  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Leads
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {total} {total === 1 ? 'lead' : 'leads'} match
              {total === 1 ? 'es' : ''} these filters
            </p>
          </div>
          <Link
            href={exportHref}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            Export CSV
          </Link>
        </div>

        <div className="mt-6 space-y-6">
          <LeadFiltersBar services={services} cities={cities} />
          <LeadTable leads={leads} />
          <Pagination
            page={page}
            totalPages={totalPages}
            searchParams={raw}
          />
        </div>
      </div>
    </section>
  );
}

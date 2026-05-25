import Link from 'next/link';

import { StatusBadge } from './status-badge';
import type { LeadRow } from '@/lib/queries/leads';

export function LeadTable({ leads }: { leads: ReadonlyArray<LeadRow> }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm text-slate-600">
          No leads match these filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <Th>Customer</Th>
            <Th>Service</Th>
            <Th>City</Th>
            <Th>Status</Th>
            <Th>Received</Th>
            <Th className="sr-only">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-50">
              <Td>
                <div className="font-medium text-slate-900">
                  {lead.fullName}
                </div>
                <div className="text-xs text-slate-500">{lead.email}</div>
              </Td>
              <Td>{lead.service}</Td>
              <Td>{lead.city ?? '—'}</Td>
              <Td>
                <StatusBadge status={lead.status} />
              </Td>
              <Td>
                <time
                  dateTime={lead.createdAt}
                  className="text-xs text-slate-600"
                >
                  {formatDate(lead.createdAt)}
                </time>
              </Td>
              <Td className="text-right">
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
                >
                  View
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 text-sm text-slate-800 ${className}`}>
      {children}
    </td>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

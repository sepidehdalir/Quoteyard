import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getLeadById, listLeadFiles, listLeadNotes } from '@/lib/queries/leads';
import { getSignedUrlsForPaths } from '@/lib/files/signed-urls';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { StatusForm } from './status-form';
import { NoteForm } from './note-form';
import { NoteItem } from './note-item';
import { PhotoGallery } from './photo-gallery';

export const metadata: Metadata = {
  title: 'Lead detail',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [lead, notes, files] = await Promise.all([
    getLeadById(id),
    listLeadNotes(id),
    listLeadFiles(id),
  ]);

  if (!lead) notFound();

  // Sign URLs server-side at render. URLs expire in 10 minutes
  // (see DEFAULT_SIGNED_URL_TTL_SECONDS) and are never persisted.
  const signedUrls = await getSignedUrlsForPaths(
    files.map((f) => f.storagePath),
  );

  return (
    <section>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          &larr; All leads
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {lead.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Received{' '}
              <time dateTime={lead.createdAt}>
                {formatDate(lead.createdAt)}
              </time>{' '}
              &middot; <StatusBadge status={lead.status} />
            </p>
          </div>
          <StatusForm leadId={lead.id} current={lead.status} />
        </div>

        {/* Contact + project */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card title="Contact">
            <DList>
              <DRow label="Email">
                <a
                  href={`mailto:${lead.email}`}
                  className="text-slate-900 underline-offset-4 hover:underline"
                >
                  {lead.email}
                </a>
              </DRow>
              <DRow label="Phone">
                <a
                  href={`tel:${lead.phone}`}
                  className="text-slate-900 underline-offset-4 hover:underline"
                >
                  {lead.phone}
                </a>
              </DRow>
              {lead.address && (
                <DRow label="Address">{lead.address}</DRow>
              )}
            </DList>
          </Card>

          <Card title="Project">
            <DList>
              <DRow label="Service">{lead.service.name}</DRow>
              <DRow label="City">{lead.city?.name ?? '—'}</DRow>
              <DRow label="Source">{lead.source}</DRow>
            </DList>
          </Card>

          <Card title="Estimate">
            <DList>
              <DRow label="Quote">
                {lead.estimatedQuoteCents !== null
                  ? formatMoney(lead.estimatedQuoteCents)
                  : '—'}
              </DRow>
              <DRow label="Updated">
                <time dateTime={lead.updatedAt}>
                  {formatDate(lead.updatedAt)}
                </time>
              </DRow>
            </DList>
          </Card>
        </div>

        {/* Description */}
        <Card title="Description" className="mt-6">
          <p className="text-sm whitespace-pre-wrap text-slate-800">
            {lead.projectDescription}
          </p>
        </Card>

        {/* Photos */}
        <div className="mt-8">
          <h2 className="text-base font-semibold text-slate-900">
            Photos
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Click any image to open the full-size file in a new tab.
            Links expire after a few minutes.
          </p>
          <div className="mt-4">
            <PhotoGallery files={files} signedUrls={signedUrls} />
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8">
          <h2 className="text-base font-semibold text-slate-900">
            Internal notes
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Visible only to admins. Customers never see these.
          </p>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            <NoteForm leadId={lead.id} />
          </div>

          {notes.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {notes.map((n) => (
                <NoteItem
                  key={n.id}
                  noteId={n.id}
                  leadId={lead.id}
                  content={n.content}
                  createdAt={n.createdAt}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No notes yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Small layout helpers ─────────────────────────────────────── */

function Card({
  title,
  className = '',
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border border-slate-200 bg-white p-5 ${className}`}>
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DList({ children }: { children: React.ReactNode }) {
  return <dl className="space-y-2 text-sm">{children}</dl>;
}

function DRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{children}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
}

import Link from 'next/link';

interface Props {
  page: number;
  totalPages: number;
  /** Current filters, as the page received them. */
  searchParams: Record<string, string | string[] | undefined>;
}

export function Pagination({ page, totalPages, searchParams }: Props) {
  if (totalPages <= 1) return null;

  const prevHref = page > 1 ? buildHref(searchParams, page - 1) : null;
  const nextHref = page < totalPages ? buildHref(searchParams, page + 1) : null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3"
    >
      <p className="text-sm text-slate-600">
        Page <span className="font-medium text-slate-900">{page}</span> of{' '}
        <span className="font-medium text-slate-900">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <PageLink href={prevHref} label="Previous" disabled={!prevHref} />
        <PageLink href={nextHref} label="Next" disabled={!nextHref} />
      </div>
    </nav>
  );
}

function PageLink({
  href,
  label,
  disabled,
}: {
  href: string | null;
  label: string;
  disabled: boolean;
}) {
  const className =
    'inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors';
  if (disabled || !href) {
    return (
      <span
        aria-disabled="true"
        className={`${className} cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400`}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${className} border-slate-300 bg-white text-slate-900 hover:bg-slate-50`}
    >
      {label}
    </Link>
  );
}

function buildHref(
  current: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (key === 'page') continue;
    if (value === undefined) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v === 'string' && v.length > 0) params.set(key, v);
  }
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : '/dashboard';
}

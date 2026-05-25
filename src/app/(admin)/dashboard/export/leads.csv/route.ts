import { NextResponse, type NextRequest } from 'next/server';

import { getCurrentAdmin } from '@/lib/supabase/auth';
import { parseLeadFilters } from '@/lib/validations/lead-filters';
import {
  listAllLeadsForExport,
  type LeadExportRow,
} from '@/lib/queries/leads';

/**
 * GET /dashboard/export/leads.csv
 *
 * Streams the filtered lead set as a CSV download. Admin-gated.
 *
 * The proxy already protects /dashboard/* at the edge, but we
 * call getCurrentAdmin() here too -- defense in depth. A
 * misconfigured matcher should never expose this endpoint.
 *
 * Excludes file URLs entirely. The CSV is a flat data dump; the
 * dashboard UI is the only place that ever holds a signed URL.
 *
 * Same filter parser as the dashboard list, so a downloaded CSV
 * matches what the admin was looking at on screen.
 */
export async function GET(request: NextRequest) {
  const me = await getCurrentAdmin();
  if (!me) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Same filter shape as the list page.
  const sp = request.nextUrl.searchParams;
  const raw: Record<string, string> = {};
  sp.forEach((value, key) => {
    raw[key] = value;
  });
  const filters = parseLeadFilters(raw);

  const rows = await listAllLeadsForExport(filters);
  const csv = renderCsv(rows);
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

/* ─── CSV rendering ─────────────────────────────────────────── */

const COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'status',
  'full_name',
  'email',
  'phone',
  'address',
  'service',
  'city',
  'estimated_quote_cents',
  'source',
  'project_description',
] as const;

function renderCsv(rows: ReadonlyArray<LeadExportRow>): string {
  const out: string[] = [];
  out.push(COLUMNS.map(csvCell).join(','));
  for (const r of rows) {
    out.push(
      [
        r.id,
        r.createdAt,
        r.updatedAt,
        r.status,
        r.fullName,
        r.email,
        r.phone,
        r.address ?? '',
        r.service,
        r.city ?? '',
        r.estimatedQuoteCents !== null ? String(r.estimatedQuoteCents) : '',
        r.source,
        r.projectDescription,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  // RFC 4180 uses CRLF, and Excel-on-Windows is happier with it.
  return out.join('\r\n') + '\r\n';
}

/**
 * Escape a value for CSV per RFC 4180, AND prevent CSV/Excel
 * formula injection.
 *
 * Formula injection: if a cell starts with `=`, `+`, `-`, `@`,
 * `\t`, or `\r`, Excel/Google Sheets interpret it as a formula
 * when the file is opened. An attacker could submit a quote
 * with name `=HYPERLINK("http://evil/", "Click")` and the admin
 * opening the CSV would see a clickable phishing link, or worse
 * if the formula calls a function with side effects (DDE
 * exploits historically allowed command execution).
 *
 * Mitigation: prefix any value beginning with one of those chars
 * with a single quote. The single quote is invisible in Excel and
 * disables formula interpretation.
 */
function csvCell(value: string | null | undefined): string {
  const raw = value ?? '';
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  // Escape quotes by doubling them, and quote any cell that
  // contains a separator, quote, or newline.
  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { LeadFilters } from '@/lib/validations/lead-filters';
import type { LeadStatus } from '@/lib/leads/status';

export interface LeadRow {
  id: string;
  status: LeadStatus;
  fullName: string;
  email: string;
  phone: string;
  city: string | null;
  service: string;
  createdAt: string;
}

export interface LeadListResult {
  leads: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Default page size for the dashboard list. */
export const LEADS_PAGE_SIZE = 25;

/**
 * Admin list view. RLS on `leads` requires `is_admin()` — a
 * non-admin authenticated session gets zero rows back, not an
 * error.
 *
 * Pagination: server-side via Supabase `range()`. The `count`
 * returned reflects the filtered total, so "Page X of Y" is
 * accurate against the current filter set.
 */
export async function listLeads(
  filters: LeadFilters,
  options: { page?: number; pageSize?: number } = {},
): Promise<LeadListResult> {
  const supabase = await createSupabaseServerClient();
  const pageSize = options.pageSize ?? LEADS_PAGE_SIZE;
  const requestedPage = Math.max(1, Math.trunc(options.page ?? 1));
  const from = (requestedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('leads')
    .select(
      `
        id,
        status,
        full_name,
        email,
        phone,
        created_at,
        service:services!inner ( name ),
        city:cities ( name )
      `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.serviceId) query = query.eq('service_id', filters.serviceId);
  if (filters.cityId) query = query.eq('city_id', filters.cityId);
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59Z`);
  if (filters.q) {
    // Case-insensitive contains across name/email/phone.
    //
    // Security: PostgREST's `.or()` argument is a comma-separated
    // list with parentheses for grouping. If we let raw user input
    // flow into that string, an attacker could inject extra clauses
    // (e.g. `foo,id.eq.<uuid>` would widen the result set).
    //
    // Strategy:
    //   1. Reject any character that has special meaning in the
    //      PostgREST filter mini-grammar (`,`, `(`, `)`, `:`, `"`,
    //      `*`, backslash). These are extremely unlikely in real
    //      name/email/phone searches; if the user pastes one we
    //      drop the search filter rather than 500 the dashboard.
    //   2. Escape `%` and `_` so the ilike pattern can't be widened.
    const SAFE_SEARCH = /^[^,()\\:"*]+$/;
    if (SAFE_SEARCH.test(filters.q)) {
      const term = `%${filters.q.replace(/[%_]/g, '\\$&')}%`;
      query = query.or(
        `full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`,
      );
    }
    // If the input contains forbidden chars we silently skip the
    // search filter -- the rest of the filters still apply.
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('[listLeads]', { code: error.code, message: error.message });
    return {
      leads: [],
      total: 0,
      page: requestedPage,
      pageSize,
      totalPages: 0,
    };
  }

  const leads: LeadRow[] = (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at,
    service: row.service?.name ?? '—',
    city: row.city?.name ?? null,
  }));

  const total = count ?? leads.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { leads, total, page: requestedPage, pageSize, totalPages };
}

export interface LeadDetail {
  id: string;
  status: LeadStatus;
  fullName: string;
  email: string;
  phone: string;
  address: string | null;
  projectDescription: string;
  estimatedQuoteCents: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  service: { id: string; name: string };
  city: { id: string; name: string } | null;
}

export async function getLeadById(id: string): Promise<LeadDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('leads')
    .select(
      `
        id,
        status,
        full_name,
        email,
        phone,
        address,
        project_description,
        estimated_quote_cents,
        source,
        created_at,
        updated_at,
        service:services!inner ( id, name ),
        city:cities ( id, name )
      `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[getLeadById]', { code: error.code, message: error.message });
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    status: data.status,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    projectDescription: data.project_description,
    estimatedQuoteCents: data.estimated_quote_cents,
    source: data.source,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    service: { id: data.service.id, name: data.service.name },
    city: data.city ? { id: data.city.id, name: data.city.name } : null,
  };
}

export interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
  authorId: string | null;
}

export async function listLeadNotes(leadId: string): Promise<LeadNote[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('lead_notes')
    .select('id, content, created_at, author_id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[listLeadNotes]', { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    authorId: row.author_id,
  }));
}

/** Service + city lookups for filter dropdowns. */
export async function listServiceOptions() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('services')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order');
  return data ?? [];
}

export async function listCityOptions() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cities')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order');
  return data ?? [];
}

export interface LeadFile {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Files attached to a lead. The `storage_path` is a Supabase
 * Storage object key -- by itself it does NOT grant access. The
 * caller must produce a signed URL (Phase 7 photo gallery) to
 * actually fetch a file.
 */
export async function listLeadFiles(leadId: string): Promise<LeadFile[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('lead_files')
    .select('id, storage_path, file_name, mime_type, size_bytes, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[listLeadFiles]', {
      code: error.code,
      message: error.message,
    });
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }));
}

/** Row shape for the CSV export. Lean -- no file URLs. */
export interface LeadExportRow {
  id: string;
  status: LeadStatus;
  fullName: string;
  email: string;
  phone: string;
  address: string | null;
  service: string;
  city: string | null;
  projectDescription: string;
  estimatedQuoteCents: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Export-friendly lead query. Same filters as `listLeads` but
 * without pagination. Caps results at 5,000 rows so a runaway
 * export can't lock up the response. If you have more than that,
 * narrow with date filters.
 *
 * Deliberately omits files -- the CSV must not leak signed URLs
 * (they'd be permanently valid in the downloaded file).
 */
export async function listAllLeadsForExport(
  filters: LeadFilters,
): Promise<LeadExportRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('leads')
    .select(
      `
        id,
        status,
        full_name,
        email,
        phone,
        address,
        project_description,
        estimated_quote_cents,
        source,
        created_at,
        updated_at,
        service:services!inner ( name ),
        city:cities ( name )
      `,
    )
    .order('created_at', { ascending: false })
    .limit(5000);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.serviceId) query = query.eq('service_id', filters.serviceId);
  if (filters.cityId) query = query.eq('city_id', filters.cityId);
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59Z`);
  if (filters.q) {
    const SAFE_SEARCH = /^[^,()\\:"*]+$/;
    if (SAFE_SEARCH.test(filters.q)) {
      const term = `%${filters.q.replace(/[%_]/g, '\\$&')}%`;
      query = query.or(
        `full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[listAllLeadsForExport]', {
      code: error.code,
      message: error.message,
    });
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    service: row.service?.name ?? '',
    city: row.city?.name ?? null,
    projectDescription: row.project_description,
    estimatedQuoteCents: row.estimated_quote_cents,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

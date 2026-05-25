import { z } from 'zod';
import { LEAD_STATUSES } from '@/lib/leads/status';

/**
 * Parses URL search params into a typed filter object.
 *
 * Everything is optional. Empty strings normalize to `undefined`.
 * Invalid values are silently dropped so a malformed URL never
 * 500s the dashboard — at worst it shows the unfiltered list.
 */
export const leadFiltersSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  serviceId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  /** ISO date (YYYY-MM-DD). Inclusive lower bound on created_at. */
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional(),
  /** ISO date (YYYY-MM-DD). Inclusive upper bound on created_at. */
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional(),
  /** Free-text search; matched against full_name/email/phone. */
  q: z.string().trim().min(1).max(120).optional(),
});

export type LeadFilters = z.infer<typeof leadFiltersSchema>;

/**
 * Parse a Next.js searchParams-shaped record into a LeadFilters.
 * Any param that fails validation is dropped from the result rather
 * than producing an error.
 */
export function parseLeadFilters(
  raw: Record<string, string | string[] | undefined>,
): LeadFilters {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v === 'string' && v.length > 0) {
      normalized[key] = v;
    }
  }
  const parsed = leadFiltersSchema.safeParse(normalized);
  return parsed.success ? parsed.data : {};
}

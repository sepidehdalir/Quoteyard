'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifyMimeFromBytes } from '@/lib/files/magic-bytes';
import { uploadLeadFiles, deleteLeadFiles } from '@/lib/files/storage';
import { sendNewLeadNotification } from '@/lib/email';
import {
  ALLOWED_MIME_TYPES,
  QUOTE_LIMITS,
  quoteFormSchema,
  type AllowedMimeType,
} from '@/lib/validations/quote';
import { getRateLimiter, QUOTE_RATE_LIMITS } from '@/lib/rate-limit';
import type { ActionResult } from '@/lib/result';

/**
 * Result type returned to the client on failure. On success the
 * action calls `redirect()` and never returns to the client at all.
 */
export type QuoteSubmissionResult = ActionResult<{ leadId: string }>;

/**
 * Server Action: validate, rate-limit, persist a public quote
 * submission. Implements Phase 2 §2.12 acceptance contract:
 *
 *   1. Honeypot
 *   2. Zod re-validation server-side
 *   3. Per-IP rate limiting (before validation, so the validation
 *      pipeline can't be used as an oracle)
 *   4. File MIME allow-list + magic-byte verification
 *   5. File size + count + total-size enforcement
 *   6. Service-role insert (bypasses RLS by design)
 *   7. CSRF: Server Actions in Next 16+ require Origin == Host
 *   8. Discriminated-union error shape; never throws to the client
 */
export async function submitQuote(
  _prevState: QuoteSubmissionResult | null,
  formData: FormData,
): Promise<QuoteSubmissionResult> {
  // ── 1. Identify caller for rate limiting ───────────────────────
  const hdrs = await headers();
  const forwarded = hdrs.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ??
    hdrs.get('x-real-ip') ??
    'unknown';

  // ── 2. Rate limit BEFORE any validation work ───────────────────
  const limiter = getRateLimiter();
  const hourly = await limiter.check(`quote:${ip}:1h`, QUOTE_RATE_LIMITS.hour);
  if (!hourly.allowed) {
    return {
      ok: false,
      formError:
        'Too many submissions from your network. Please try again later.',
    };
  }
  const daily = await limiter.check(`quote:${ip}:1d`, QUOTE_RATE_LIMITS.day);
  if (!daily.allowed) {
    return {
      ok: false,
      formError:
        "You've reached today's submission limit. Please try again tomorrow.",
    };
  }

  // ── 3. Read raw FormData ───────────────────────────────────────
  const raw = {
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    address: String(formData.get('address') ?? ''),
    serviceId: String(formData.get('serviceId') ?? ''),
    cityId: String(formData.get('cityId') ?? ''),
    projectDescription: String(formData.get('projectDescription') ?? ''),
    website: String(formData.get('website') ?? ''), // honeypot
  };

  // ── 4. Honeypot ────────────────────────────────────────────────
  // If filled, return a fake-success redirect so the bot doesn't
  // learn that submission failed. Nothing is written.
  if (raw.website.length > 0) {
    redirect('/thank-you?id=sink');
  }

  // ── 5. Zod re-validation (server is authoritative) ─────────────
  const parsed = quoteFormSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors;
    const fieldErrors: Record<string, string[]> = {};
    for (const [field, msgs] of Object.entries(flat)) {
      if (msgs && msgs.length > 0) fieldErrors[field] = msgs;
    }
    return {
      ok: false,
      formError: 'Please correct the highlighted fields.',
      fieldErrors,
    };
  }
  const data = parsed.data;

  // ── 6. File validation (when files are present) ────────────────
  // Phase 3 wires the validation pipeline; the form input itself
  // is added in Phase 6 together with Supabase Storage upload.
  // When files start flowing through this action, the loop below
  // will already enforce the full contract.
  const files = formData
    .getAll('files')
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length > QUOTE_LIMITS.files.maxFiles) {
    return {
      ok: false,
      formError: `You can upload at most ${QUOTE_LIMITS.files.maxFiles} files.`,
    };
  }
  let totalBytes = 0;
  for (const file of files) {
    if (file.size > QUOTE_LIMITS.files.maxBytesPerFile) {
      return {
        ok: false,
        formError: `"${file.name}" exceeds the 10 MB per-file limit.`,
      };
    }
    totalBytes += file.size;
    if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
      return {
        ok: false,
        formError: `"${file.name}" is not an accepted image type.`,
      };
    }
    const matches = await verifyMimeFromBytes(
      file,
      file.type as AllowedMimeType,
    );
    if (!matches) {
      return {
        ok: false,
        formError: `"${file.name}" content does not match its file type.`,
      };
    }
  }
  if (totalBytes > QUOTE_LIMITS.files.maxTotalBytes) {
    return { ok: false, formError: 'Total upload size exceeds 25 MB.' };
  }

  // ── 7. Persist via service-role client ─────────────────────────
  let leadId: string;
  try {
    const supabase = createSupabaseAdminClient();
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        address: data.address ? data.address : null,
        service_id: data.serviceId,
        city_id: data.cityId ? data.cityId : null,
        project_description: data.projectDescription,
        source: 'website',
      })
      .select('id')
      .single();

    if (error || !lead) {
      // Log server-side; never leak PG details to the client.
      console.error('[submitQuote] insert failed', {
        message: error?.message,
        code: error?.code,
      });
      return {
        ok: false,
        formError:
          'We could not save your request right now. Please try again in a moment.',
      };
    }
    leadId = lead.id;
  } catch (err) {
    console.error('[submitQuote] unexpected error', err);
    return {
      ok: false,
      formError:
        'Something went wrong on our end. Please try again in a moment.',
    };
  }

  // ── 8. Upload files to Supabase Storage + insert lead_files rows ─
  //
  // Failure here does NOT roll back the lead. Better to keep the
  // lead and lose a photo than the reverse. uploadLeadFiles logs
  // and returns the subset that succeeded.
  //
  // Orphan handling: if Storage upload succeeds but the metadata
  // insert fails, we delete the just-uploaded objects so the
  // bucket doesn't accumulate orphans. If the cleanup ALSO fails,
  // we log loudly so ops can investigate. The production playbook
  // is a periodic Supabase Edge Function cron that lists Storage
  // objects and removes any whose path is not referenced in
  // lead_files -- see README "Orphaned file cleanup strategy".
  let uploadedCount = 0;
  if (files.length > 0) {
    try {
      const supabase = createSupabaseAdminClient();
      const uploaded = await uploadLeadFiles(leadId, files);
      if (uploaded.length > 0) {
        const { error } = await supabase.from('lead_files').insert(
          uploaded.map((u) => ({
            lead_id: leadId,
            storage_path: u.storagePath,
            file_name: u.fileName,
            mime_type: u.mimeType,
            size_bytes: u.sizeBytes,
          })),
        );
        if (error) {
          console.error('[submitQuote] lead_files insert failed', {
            code: error.code,
            message: error.message,
          });
          // Clean up the just-uploaded objects so they don't orphan.
          await deleteLeadFiles(uploaded.map((u) => u.storagePath));
        } else {
          uploadedCount = uploaded.length;
        }
      }
    } catch (err) {
      console.error('[submitQuote] file processing failed', err);
    }
  }

  // ── 9. Notify the admin via Resend (fire-and-forget) ───────────
  // A Resend outage MUST NOT prevent the customer's success. We
  // await so log lines are ordered, but discard the boolean.
  try {
    const supabase = createSupabaseAdminClient();
    const { data: lookups } = await supabase
      .from('leads')
      .select(
        `
          full_name,
          email,
          phone,
          project_description,
          service:services!inner ( name ),
          city:cities ( name )
        `,
      )
      .eq('id', leadId)
      .single();

    if (lookups) {
      await sendNewLeadNotification({
        leadId,
        fullName: lookups.full_name,
        email: lookups.email,
        phone: lookups.phone,
        projectDescription: lookups.project_description,
        service: lookups.service?.name ?? '-',
        city: lookups.city?.name ?? null,
        fileCount: uploadedCount,
      });
    }
  } catch (err) {
    console.error('[submitQuote] notification failed', err);
  }

  // ── 10. Success → redirect (throws, never returns) ─────────────
  redirect(`/thank-you?id=${leadId}`);
}

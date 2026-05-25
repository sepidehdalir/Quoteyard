'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentAdmin } from '@/lib/supabase/auth';
import {
  noteContentSchema,
  updateStatusSchema,
} from '@/lib/validations/lead-mutations';
import type { ActionResult } from '@/lib/result';

export type MutationResult = ActionResult<{ leadId: string }>;

function unauthorized(): MutationResult {
  return {
    ok: false,
    formError: 'Your session has expired. Please sign in again.',
  };
}

/**
 * All Server Actions here follow the same shape:
 *   1. Authenticate (getCurrentAdmin) -- belt before the RLS suspenders
 *   2. Zod validate input
 *   3. Perform the mutation under the user's session (RLS enforces
 *      that the caller is in admin_users)
 *   4. revalidatePath so the dashboard refresh shows the change
 *   5. Return ActionResult; never throw to the client
 */

export async function updateLeadStatus(
  _prev: MutationResult | null,
  formData: FormData,
): Promise<MutationResult> {
  const me = await getCurrentAdmin();
  if (!me) return unauthorized();

  const parsed = updateStatusSchema.safeParse({
    leadId: formData.get('leadId'),
    status: formData.get('status'),
  });
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('leads')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.leadId);

  if (error) {
    console.error('[updateLeadStatus]', {
      code: error.code,
      message: error.message,
    });
    return {
      ok: false,
      formError: 'Could not update status. Please try again.',
    };
  }

  revalidatePath(`/dashboard/leads/${parsed.data.leadId}`);
  revalidatePath('/dashboard');
  return { ok: true, data: { leadId: parsed.data.leadId } };
}

export async function addLeadNote(
  _prev: MutationResult | null,
  formData: FormData,
): Promise<MutationResult> {
  const me = await getCurrentAdmin();
  if (!me) return unauthorized();

  const parsed = noteContentSchema.safeParse({
    leadId: formData.get('leadId'),
    content: formData.get('content'),
  });
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('lead_notes').insert({
    lead_id: parsed.data.leadId,
    content: parsed.data.content,
    author_id: me.userId,
  });

  if (error) {
    console.error('[addLeadNote]', { code: error.code, message: error.message });
    return {
      ok: false,
      formError: 'Could not save the note. Please try again.',
    };
  }

  revalidatePath(`/dashboard/leads/${parsed.data.leadId}`);
  return { ok: true, data: { leadId: parsed.data.leadId } };
}

export async function deleteLeadNote(formData: FormData): Promise<void> {
  const me = await getCurrentAdmin();
  if (!me) return;

  const deleteSchema = z.object({
    noteId: z.string().uuid(),
    leadId: z.string().uuid(),
  });
  const parsed = deleteSchema.safeParse({
    noteId: formData.get('noteId'),
    leadId: formData.get('leadId'),
  });
  if (!parsed.success) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('lead_notes')
    .delete()
    .eq('id', parsed.data.noteId)
    .eq('lead_id', parsed.data.leadId);

  if (error) {
    console.error('[deleteLeadNote]', {
      code: error.code,
      message: error.message,
    });
    return;
  }
  revalidatePath(`/dashboard/leads/${parsed.data.leadId}`);
}

/* ─── End of file ──────────────────────────────────────────────── */

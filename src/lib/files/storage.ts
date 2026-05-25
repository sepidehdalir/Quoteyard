import 'server-only';

import { randomUUID } from 'crypto';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AllowedMimeType } from '@/lib/validations/quote';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'lead-files';

const EXT_BY_MIME: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export interface UploadedFile {
  /** Storage path, suitable for inserting into lead_files.storage_path. */
  storagePath: string;
  /** Original filename from the upload. */
  fileName: string;
  /** Confirmed MIME (already verified by magic bytes before this is called). */
  mimeType: AllowedMimeType;
  /** Size in bytes. */
  sizeBytes: number;
}

/**
 * Upload validated files to Supabase Storage and return metadata
 * suitable for inserting into lead_files.
 *
 * IMPORTANT preconditions enforced by the caller:
 *   - file count, size, MIME allow-list, and magic bytes have all
 *     been verified BEFORE this function is called. We trust the
 *     inputs here.
 *
 * Storage path discipline (Phase 2 §2.12 #6):
 *   - leads/{leadId}/{uuid}.{ext}
 *   - The customer's filename is NEVER used in the path -- that
 *     prevents path traversal, weird extensions, and case-folding
 *     collisions. The original name is preserved in lead_files
 *     for display only.
 *
 * Atomicity: this is best-effort. If we fail halfway through (say
 * file 3 of 5), the lead row stays and we return the files we did
 * upload. The customer's submission still succeeded; the missing
 * files surface as a console.error for ops to investigate. We do
 * NOT roll back the lead -- losing a lead is worse than losing
 * one photo.
 */
export async function uploadLeadFiles(
  leadId: string,
  files: ReadonlyArray<File>,
): Promise<UploadedFile[]> {
  if (files.length === 0) return [];

  const admin = createSupabaseAdminClient();
  const storage = admin.storage.from(BUCKET);
  const uploaded: UploadedFile[] = [];

  for (const file of files) {
    const mime = file.type as AllowedMimeType;
    const ext = EXT_BY_MIME[mime] ?? 'bin';
    const objectName = `${randomUUID()}.${ext}`;
    const storagePath = `leads/${leadId}/${objectName}`;

    const buffer = new Uint8Array(await file.arrayBuffer());
    const { error } = await storage.upload(storagePath, buffer, {
      contentType: mime,
      // upsert: false is the default and what we want -- the
      // randomUUID() guarantees no collisions, so upsert would only
      // hide bugs.
      upsert: false,
    });
    if (error) {
      console.error('[uploadLeadFiles] upload failed', {
        leadId,
        file: file.name,
        message: error.message,
      });
      continue;
    }
    uploaded.push({
      storagePath,
      fileName: file.name,
      mimeType: mime,
      sizeBytes: file.size,
    });
  }

  return uploaded;
}

/**
 * Best-effort deletion of objects that were just uploaded but
 * couldn't be recorded in `lead_files`. Called from the submit
 * action when the metadata insert fails after a successful upload.
 *
 * "Best effort" means: we try once, log any failure, and move on.
 * If THIS fails too, the objects are truly orphaned -- see the
 * "Orphaned file cleanup strategy" note in the project README for
 * the production garbage-collector plan (Supabase Edge Function
 * cron) that handles the residual case.
 */
export async function deleteLeadFiles(
  storagePaths: ReadonlyArray<string>,
): Promise<void> {
  if (storagePaths.length === 0) return;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .remove([...storagePaths]);
  if (error) {
    console.error('[deleteLeadFiles] cleanup failed -- orphaned files', {
      paths: storagePaths,
      message: error.message,
    });
  }
}

import { z } from 'zod';
import { LEAD_STATUSES } from '@/lib/leads/status';

export const updateStatusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES),
});

export type UpdateStatusValues = z.infer<typeof updateStatusSchema>;

export const noteContentSchema = z.object({
  leadId: z.string().uuid(),
  content: z
    .string()
    .trim()
    .min(1, 'Please write something')
    .max(4000, 'Note is too long'),
});

export type NoteContentValues = z.infer<typeof noteContentSchema>;

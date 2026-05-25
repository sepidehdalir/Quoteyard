import { z } from 'zod';

/**
 * Login form schema. Used by both the client (RHF resolver) and the
 * Server Action that processes the submission.
 *
 * We deliberately do NOT validate password strength here. That's
 * Supabase's job at sign-up. At login, we just require the field is
 * present so we can pass it to Supabase, which returns its own
 * error for wrong credentials.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(254, 'Email is too long'),

  password: z
    .string()
    .min(1, 'Please enter your password')
    .max(200, 'Password is too long'),
});

export type LoginValues = z.infer<typeof loginSchema>;

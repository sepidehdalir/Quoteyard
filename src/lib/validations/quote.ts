import { z } from 'zod';

/**
 * Numeric limits that match the database `check` constraints in
 * supabase/migrations/0001_schema.sql. Keep these in sync.
 */
export const QUOTE_LIMITS = {
  fullName: { min: 2, max: 120 },
  email: { max: 254 },
  phone: { min: 5, max: 40 },
  address: { max: 240 },
  description: { min: 10, max: 4000 },
  files: {
    maxFiles: 5,
    maxBytesPerFile: 10 * 1024 * 1024, // 10 MB — matches lead_files check
    maxTotalBytes: 25 * 1024 * 1024, //  25 MB total per submission
  },
} as const;

/**
 * MIME types accepted for the photo uploads. Verified twice on
 * submit: declared MIME against this list, then magic bytes against
 * declared MIME. Reject if either fails.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const satisfies readonly string[];

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Phone characters are tolerant — Vancouver-area submitters use a
 * mix of +1, parentheses, dashes, and spaces. We validate length
 * and character class, not strict E.164 format.
 */
const phoneRegex = /^[+\d\s\-().]+$/;

export const quoteFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(QUOTE_LIMITS.fullName.min, 'Please enter your full name')
    .max(QUOTE_LIMITS.fullName.max, 'Name is too long'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(QUOTE_LIMITS.email.max, 'Email is too long'),

  phone: z
    .string()
    .trim()
    .min(QUOTE_LIMITS.phone.min, 'Please enter your phone number')
    .max(QUOTE_LIMITS.phone.max, 'Phone number is too long')
    .regex(phoneRegex, 'Phone number contains invalid characters'),

  address: z
    .string()
    .trim()
    .max(QUOTE_LIMITS.address.max, 'Address is too long')
    .optional()
    .or(z.literal('')),

  serviceId: z.string().uuid('Please choose a service'),

  cityId: z
    .string()
    .uuid('Please choose a city')
    .optional()
    .or(z.literal('')),

  projectDescription: z
    .string()
    .trim()
    .min(
      QUOTE_LIMITS.description.min,
      `Please describe your project (at least ${QUOTE_LIMITS.description.min} characters)`,
    )
    .max(QUOTE_LIMITS.description.max, 'Description is too long'),

  /**
   * Honeypot. Real users never see this field. Bots that fill every
   * input will trip it. Server treats a non-empty value as spam and
   * silently sinks the submission.
   */
  website: z.string().max(0).optional(),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

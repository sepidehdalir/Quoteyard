'use client';

import { useActionState, useEffect, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  ALLOWED_MIME_TYPES,
  QUOTE_LIMITS,
  quoteFormSchema,
  type QuoteFormValues,
} from '@/lib/validations/quote';
import { submitQuote, type QuoteSubmissionResult } from './actions';

interface Option {
  id: string;
  name: string;
}

interface QuoteFormProps {
  services: ReadonlyArray<Option>;
  cities: ReadonlyArray<Option>;
}

export function QuoteForm({ services, cities }: QuoteFormProps) {
  const [serverResult, formAction, isPending] = useActionState<
    QuoteSubmissionResult | null,
    FormData
  >(submitQuote, null);

  const {
    register,
    setError,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      serviceId: '',
      cityId: '',
      projectDescription: '',
      website: '',
    },
  });

  useEffect(() => {
    if (serverResult && !serverResult.ok && serverResult.fieldErrors) {
      for (const [field, msgs] of Object.entries(serverResult.fieldErrors)) {
        const first = msgs[0];
        if (first) {
          setError(field as keyof QuoteFormValues, { message: first });
        }
      }
    }
  }, [serverResult, setError]);

  const formError =
    serverResult && !serverResult.ok ? serverResult.formError : null;

  return (
    <form action={formAction} noValidate className="mt-10 space-y-6">
      {/* Honeypot — hidden from real users, picked up by bots. */}
      <div aria-hidden className="hidden" style={{ display: 'none' }}>
        <label htmlFor="website">Website (leave blank)</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('website')}
        />
      </div>

      <Field
        label="Full name"
        name="fullName"
        error={errors.fullName?.message}
        required
      >
        {(a11y) => (
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            className={inputClass(!!errors.fullName)}
            {...a11y}
            {...register('fullName')}
          />
        )}
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Email"
          name="email"
          error={errors.email?.message}
          required
        >
          {(a11y) => (
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              className={inputClass(!!errors.email)}
              {...a11y}
              {...register('email')}
            />
          )}
        </Field>

        <Field
          label="Phone"
          name="phone"
          error={errors.phone?.message}
          required
        >
          {(a11y) => (
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              className={inputClass(!!errors.phone)}
              {...a11y}
              {...register('phone')}
            />
          )}
        </Field>
      </div>

      <Field
        label="Project address"
        name="address"
        error={errors.address?.message}
        hint="Optional — helps us scope travel and materials."
      >
        {(a11y) => (
          <input
            id="address"
            type="text"
            autoComplete="street-address"
            className={inputClass(!!errors.address)}
            {...a11y}
            {...register('address')}
          />
        )}
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Service"
          name="serviceId"
          error={errors.serviceId?.message}
          required
        >
          {(a11y) => (
            <select
              id="serviceId"
              className={inputClass(!!errors.serviceId)}
              defaultValue=""
              {...a11y}
              {...register('serviceId')}
            >
              <option value="" disabled>
                Choose a service…
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label="City"
          name="cityId"
          error={errors.cityId?.message}
          hint="Optional"
        >
          {(a11y) => (
            <select
              id="cityId"
              className={inputClass(!!errors.cityId)}
              defaultValue=""
              {...a11y}
              {...register('cityId')}
            >
              <option value="">No preference</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field
        label="Project description"
        name="projectDescription"
        error={errors.projectDescription?.message}
        hint="Scope, materials, timeline — anything useful."
        required
      >
        {(a11y) => (
          <textarea
            id="projectDescription"
            rows={6}
            className={inputClass(!!errors.projectDescription)}
            {...a11y}
            {...register('projectDescription')}
          />
        )}
      </Field>

      <FileUpload />

      {formError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {formError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 items-center justify-center rounded-md bg-slate-900 px-6 text-base font-medium text-white transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </form>
  );
}

/* ──────────────────────────────────────────────────────────────── */

/**
 * Accessibility attributes applied to the actual <input>, <select>,
 * or <textarea> rendered by a Field's children. The Field component
 * computes them and hands them to the render function so they end
 * up on the real form control (not on a wrapper div).
 */
interface FieldA11y {
  'aria-describedby': string | undefined;
  'aria-invalid': boolean | undefined;
}

function Field({
  label,
  name,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (a11y: FieldA11y) => React.ReactNode;
}) {
  const describedBy = error
    ? `${name}-error`
    : hint
      ? `${name}-hint`
      : undefined;

  const a11y: FieldA11y = {
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
  };

  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-slate-900"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children(a11y)}
      {hint && !error && (
        <p id={`${name}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${name}-error`}
          role="alert"
          className="mt-1.5 text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  const base =
    'block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';
  const palette = hasError
    ? 'border-red-300 focus-visible:border-red-600 focus-visible:ring-red-600'
    : 'border-slate-300 focus-visible:border-slate-900 focus-visible:ring-slate-900';
  return `${base} ${palette}`;
}

/* ──────────────────────────────────────────────────────────────── */

/**
 * Optional photo upload. Client-side checks are UX-only -- the
 * server (actions.ts + magic-bytes.ts) re-runs every validation,
 * including magic-byte verification, before anything is written.
 *
 * The input name `files` is what the Server Action's
 * formData.getAll('files') reads.
 */
function FileUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [issue, setIssue] = useState<string | null>(null);

  const accept = ALLOWED_MIME_TYPES.join(',');
  const { maxFiles, maxBytesPerFile, maxTotalBytes } = QUOTE_LIMITS.files;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (picked.length === 0) {
      setFiles([]);
      setIssue(null);
      return;
    }
    if (picked.length > maxFiles) {
      setFiles([]);
      setIssue(`Please choose at most ${maxFiles} files.`);
      e.target.value = '';
      return;
    }
    let total = 0;
    for (const f of picked) {
      if (f.size > maxBytesPerFile) {
        setFiles([]);
        setIssue(`"${f.name}" is larger than 10 MB.`);
        e.target.value = '';
        return;
      }
      if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(f.type)) {
        setFiles([]);
        setIssue(`"${f.name}" is not an accepted image type.`);
        e.target.value = '';
        return;
      }
      total += f.size;
    }
    if (total > maxTotalBytes) {
      setFiles([]);
      setIssue('Total size exceeds 25 MB.');
      e.target.value = '';
      return;
    }
    setFiles(picked);
    setIssue(null);
  }

  return (
    <div>
      <label
        htmlFor="files"
        className="mb-1.5 block text-sm font-medium text-slate-900"
      >
        Photos
      </label>
      <input
        id="files"
        name="files"
        type="file"
        multiple
        accept={accept}
        onChange={handleChange}
        className="block w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-slate-800"
      />
      <p className="mt-1.5 text-xs text-slate-500">
        Optional. JPG, PNG, WEBP, or HEIC. Up to {maxFiles} files, 10 MB
        each, 25 MB total.
      </p>
      {issue && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {issue}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex justify-between">
              <span className="truncate pr-2">{f.name}</span>
              <span className="text-slate-400">{formatBytes(f.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

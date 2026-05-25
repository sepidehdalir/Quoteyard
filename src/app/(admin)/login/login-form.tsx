'use client';

import { useActionState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { loginSchema, type LoginValues } from '@/lib/validations/auth';
import { signIn, type LoginResult } from './actions';

export function LoginForm() {
  const [serverResult, formAction, isPending] = useActionState<
    LoginResult | null,
    FormData
  >(signIn, null);

  const {
    register,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (serverResult && !serverResult.ok && serverResult.fieldErrors) {
      for (const [field, msgs] of Object.entries(serverResult.fieldErrors)) {
        const first = msgs[0];
        if (first) {
          setError(field as keyof LoginValues, { message: first });
        }
      }
    }
  }, [serverResult, setError]);

  const formError =
    serverResult && !serverResult.ok ? serverResult.formError : null;

  return (
    <form action={formAction} noValidate className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-slate-900"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={errors.email ? true : undefined}
          className={inputClass(!!errors.email)}
          {...register('email')}
        />
        {errors.email && (
          <p
            id="email-error"
            role="alert"
            className="mt-1.5 text-xs text-red-600"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-slate-900"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-describedby={errors.password ? 'password-error' : undefined}
          aria-invalid={errors.password ? true : undefined}
          className={inputClass(!!errors.password)}
          {...register('password')}
        />
        {errors.password && (
          <p
            id="password-error"
            role="alert"
            className="mt-1.5 text-xs text-red-600"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      {formError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {formError}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-slate-900 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
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

'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { addLeadNote, type MutationResult } from './actions';

export function NoteForm({ leadId }: { leadId: string }) {
  const [result, formAction] = useActionState<MutationResult | null, FormData>(
    addLeadNote,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the textarea once the server confirms success.
  useEffect(() => {
    if (result?.ok) {
      formRef.current?.reset();
    }
  }, [result]);

  const contentError =
    result && !result.ok ? result.fieldErrors?.content?.[0] : null;
  const formError =
    result && !result.ok && !result.fieldErrors ? result.formError : null;

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div>
        <label htmlFor="content" className="sr-only">
          Add an internal note
        </label>
        <textarea
          id="content"
          name="content"
          rows={3}
          placeholder="Add an internal note (visible to admins only)…"
          aria-describedby={contentError ? 'content-error' : undefined}
          aria-invalid={contentError ? true : undefined}
          className={`block w-full rounded-md border px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:outline-none ${
            contentError
              ? 'border-red-300 focus-visible:border-red-600 focus-visible:ring-red-600'
              : 'border-slate-300 focus-visible:border-slate-900 focus-visible:ring-slate-900'
          }`}
        />
        {contentError && (
          <p
            id="content-error"
            role="alert"
            className="mt-1.5 text-xs text-red-600"
          >
            {contentError}
          </p>
        )}
      </div>
      {formError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {formError}
        </div>
      )}
      <div className="flex justify-end">
        <PostButton />
      </div>
    </form>
  );
}

function PostButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Add note'}
    </button>
  );
}

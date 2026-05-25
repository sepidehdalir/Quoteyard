'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { LEAD_STATUSES, LEAD_STATUS_DISPLAY, type LeadStatus } from '@/lib/leads/status';
import { updateLeadStatus, type MutationResult } from './actions';

interface Props {
  leadId: string;
  current: LeadStatus;
}

export function StatusForm({ leadId, current }: Props) {
  const [result, formAction] = useActionState<MutationResult | null, FormData>(
    updateLeadStatus,
    null,
  );

  const error = result && !result.ok ? result.formError : null;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="status" className="sr-only">
        Status
      </label>
      <select
        id="status"
        name="status"
        defaultValue={current}
        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_DISPLAY[s].label}
          </option>
        ))}
      </select>
      <SaveButton />
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Update'}
    </button>
  );
}

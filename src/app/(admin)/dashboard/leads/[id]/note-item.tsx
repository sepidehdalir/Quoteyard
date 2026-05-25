'use client';

import { useFormStatus } from 'react-dom';
import { deleteLeadNote } from './actions';

export function NoteItem({
  noteId,
  leadId,
  content,
  createdAt,
}: {
  noteId: string;
  leadId: string;
  content: string;
  createdAt: string;
}) {
  return (
    <li className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm whitespace-pre-wrap text-slate-800">
          {content}
        </p>
        <form action={deleteLeadNote}>
          <input type="hidden" name="noteId" value={noteId} />
          <input type="hidden" name="leadId" value={leadId} />
          <DeleteButton />
        </form>
      </div>
      <time
        dateTime={createdAt}
        className="mt-2 block text-xs text-slate-500"
      >
        {formatRelative(createdAt)}
      </time>
    </li>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Delete note"
      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-60"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

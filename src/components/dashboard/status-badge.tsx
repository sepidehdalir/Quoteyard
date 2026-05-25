import { LEAD_STATUS_DISPLAY, type LeadStatus } from '@/lib/leads/status';

export function StatusBadge({ status }: { status: LeadStatus }) {
  const { label, className } = LEAD_STATUS_DISPLAY[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

import type { Database } from '@/types/database';

export type LeadStatus = Database['public']['Enums']['lead_status'];

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'quoted',
  'won',
  'lost',
] as const satisfies readonly LeadStatus[];

export interface StatusDisplay {
  label: string;
  /** Tailwind class string. Foreground + background + border. */
  className: string;
}

export const LEAD_STATUS_DISPLAY: Record<LeadStatus, StatusDisplay> = {
  new: {
    label: 'New',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  quoted: {
    label: 'Quoted',
    className: 'bg-violet-50 text-violet-800 border-violet-200',
  },
  won: {
    label: 'Won',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  lost: {
    label: 'Lost',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

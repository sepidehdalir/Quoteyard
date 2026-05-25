'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';

import { LEAD_STATUSES } from '@/lib/leads/status';

interface Option {
  id: string;
  name: string;
}

interface LeadFiltersProps {
  services: ReadonlyArray<Option>;
  cities: ReadonlyArray<Option>;
}

export function LeadFiltersBar({ services, cities }: LeadFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Initial values come from the URL so the form is hydrated with
  // whatever the server already applied.
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [serviceId, setServiceId] = useState(sp.get('serviceId') ?? '');
  const [cityId, setCityId] = useState(sp.get('cityId') ?? '');
  const [from, setFrom] = useState(sp.get('from') ?? '');
  const [to, setTo] = useState(sp.get('to') ?? '');

  function buildSearch() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (serviceId) params.set('serviceId', serviceId);
    if (cityId) params.set('cityId', cityId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params.toString();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const qs = buildSearch();
    startTransition(() => {
      router.replace(qs ? `/dashboard?${qs}` : '/dashboard');
    });
  }

  function handleClear() {
    setQ('');
    setStatus('');
    setServiceId('');
    setCityId('');
    setFrom('');
    setTo('');
    startTransition(() => {
      router.replace('/dashboard');
    });
  }

  const hasFilters = q || status || serviceId || cityId || from || to;

  return (
    <form
      onSubmit={handleSubmit}
      method="GET"
      action="/dashboard"
      className="rounded-md border border-slate-200 bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label htmlFor="f-q" className="sr-only">
            Search
          </label>
          <input
            id="f-q"
            name="q"
            type="search"
            placeholder="Search name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="block h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
          />
        </div>

        <div>
          <label htmlFor="f-status" className="sr-only">
            Status
          </label>
          <select
            id="f-status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-service" className="sr-only">
            Service
          </label>
          <select
            id="f-service"
            name="serviceId"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className={selectClass}
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-city" className="sr-only">
            City
          </label>
          <select
            id="f-city"
            name="cityId"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className={selectClass}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            name="from"
            aria-label="From date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={selectClass}
          />
          <input
            type="date"
            name="to"
            aria-label="To date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={selectClass}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            Clear
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? 'Applying…' : 'Apply filters'}
        </button>
      </div>
    </form>
  );
}

const selectClass =
  'block h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none';

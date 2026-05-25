-- ───────────────────────────────────────────────────────────────────
-- 0001_schema.sql  —  Tables, enums, indexes, triggers
-- ───────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- Enums --------------------------------------------------------------
create type public.lead_status as enum (
  'new', 'contacted', 'quoted', 'won', 'lost'
);

-- Shared updated_at trigger function ---------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- services (reference data) ------------------------------------------
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index services_active_sort_idx
  on public.services (is_active, sort_order);

-- cities (reference data) --------------------------------------------
create table public.cities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  province    text not null default 'BC',
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index cities_active_sort_idx
  on public.cities (is_active, sort_order);

-- admin_users (whitelist of admins) ----------------------------------
-- A user must exist in auth.users AND have a row here to be treated
-- as an admin. Authenticating with Supabase alone is not sufficient.
create table public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now()
);
create index admin_users_email_idx on public.admin_users (email);

-- leads --------------------------------------------------------------
create table public.leads (
  id                      uuid primary key default gen_random_uuid(),
  status                  public.lead_status not null default 'new',
  service_id              uuid not null
    references public.services(id) on delete restrict,
  city_id                 uuid
    references public.cities(id) on delete set null,
  full_name               text not null
    check (char_length(full_name) between 1 and 120),
  email                   text not null
    check (char_length(email) between 3 and 254),
  phone                   text not null
    check (char_length(phone) between 5 and 40),
  address                 text
    check (address is null or char_length(address) <= 240),
  project_description     text not null
    check (char_length(project_description) between 1 and 4000),
  estimated_quote_cents   bigint
    check (estimated_quote_cents is null or estimated_quote_cents >= 0),
  source                  text not null default 'website',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index leads_status_created_idx on public.leads (status, created_at desc);
create index leads_created_idx        on public.leads (created_at desc);
create index leads_service_idx        on public.leads (service_id);
create index leads_city_idx           on public.leads (city_id);
create index leads_email_idx          on public.leads (email);

create trigger leads_set_updated_at
  before update on public.leads
  for each row
  execute function public.set_updated_at();

-- lead_notes ---------------------------------------------------------
create table public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null
    references public.leads(id) on delete cascade,
  author_id  uuid
    references auth.users(id) on delete set null,
  content    text not null
    check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index lead_notes_lead_created_idx
  on public.lead_notes (lead_id, created_at desc);

-- lead_files ---------------------------------------------------------
create table public.lead_files (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null
    references public.leads(id) on delete cascade,
  storage_path  text not null unique,
  file_name     text not null,
  mime_type     text not null,
  size_bytes    bigint not null
    check (size_bytes > 0 and size_bytes <= 10485760),  -- 10 MB
  created_at    timestamptz not null default now()
);
create index lead_files_lead_idx on public.lead_files (lead_id);

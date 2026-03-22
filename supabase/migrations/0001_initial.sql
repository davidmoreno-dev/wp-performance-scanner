-- =========================================================
-- WP Performance Scanner - Initial schema
-- Version: 1.0.0
-- Description: Base schema for MVP - WordPress performance scanning
-- Tables: profiles, scans, scan_results, scan_events
-- =========================================================

-- =========================================================
-- REQUIREMENTS
-- =========================================================
-- - Supabase project with PostgreSQL 14+
-- - pgcrypto extension enabled
-- - Run via Supabase CLI: supabase db push
--   or paste into Supabase SQL Editor
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'scan_status'
  ) then
    create type public.scan_status as enum (
      'pending',
      'queued',
      'running',
      'completed',
      'failed'
    );
  end if;
end
$$;

-- =========================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- =========================================================
-- PROFILES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =========================================================
-- SCANS
-- =========================================================

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),

  user_id uuid references auth.users(id) on delete set null,

  original_url text not null,
  normalized_url text not null,
  final_url text,

  status public.scan_status not null default 'pending',

  score integer check (score is null or (score >= 0 and score <= 100)),
  wp_detected boolean,
  wp_version text,

  error_message text,

  queued_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_scans_user_id on public.scans(user_id);
create index if not exists idx_scans_status on public.scans(status);
create index if not exists idx_scans_created_at on public.scans(created_at desc);
create index if not exists idx_scans_public_token on public.scans(public_token);

drop trigger if exists trg_scans_updated_at on public.scans;
create trigger trg_scans_updated_at
before update on public.scans
for each row
execute function public.set_updated_at();

-- =========================================================
-- SCAN RESULTS
-- =========================================================

create table if not exists public.scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null unique references public.scans(id) on delete cascade,

  page_title text,

  load_time_ms integer,
  dom_content_loaded_ms integer,
  request_count integer,
  total_bytes bigint,

  image_count integer,
  heavy_images_count integer,
  heavy_images jsonb not null default '[]'::jsonb,

  script_count integer,
  heavy_scripts_count integer,
  heavy_scripts jsonb not null default '[]'::jsonb,

  stylesheet_count integer,
  heavy_stylesheets_count integer,
  heavy_stylesheets jsonb not null default '[]'::jsonb,

  lazy_loading_implemented boolean,
  lazy_images_count integer,
  non_lazy_images_count integer,

  recommendations jsonb not null default '[]'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_scan_results_scan_id on public.scan_results(scan_id);

drop trigger if exists trg_scan_results_updated_at on public.scan_results;
create trigger trg_scan_results_updated_at
before update on public.scan_results
for each row
execute function public.set_updated_at();

-- =========================================================
-- SCAN EVENTS
-- =========================================================

create table if not exists public.scan_events (
  id bigserial primary key,
  scan_id uuid not null references public.scans(id) on delete cascade,
  event_type text not null,
  message text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_scan_events_scan_id on public.scan_events(scan_id);
create index if not exists idx_scan_events_created_at on public.scan_events(created_at desc);

-- =========================================================
-- RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.scan_results enable row level security;
alter table public.scan_events enable row level security;

-- =========================================================
-- POLICIES: profiles
-- =========================================================

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

-- =========================================================
-- POLICIES: scans
-- =========================================================

drop policy if exists "scans_select_own" on public.scans;
create policy "scans_select_own"
on public.scans
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "scans_insert_own" on public.scans;
create policy "scans_insert_own"
on public.scans
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "scans_insert_public" on public.scans;
create policy "scans_insert_public"
on public.scans
for insert
to anon, authenticated
with check (true);

drop policy if exists "scans_update_own" on public.scans;
create policy "scans_update_own"
on public.scans
for update
to authenticated
using (auth.uid() = user_id);

drop policy if exists "scans_update_public" on public.scans;
create policy "scans_update_public"
on public.scans
for update
to anon, authenticated
using (true);

-- =========================================================
-- POLICIES: scan_results
-- =========================================================

drop policy if exists "scan_results_select_own" on public.scan_results;
create policy "scan_results_select_own"
on public.scan_results
for select
to authenticated
using (
  exists (
    select 1
    from public.scans s
    where s.id = scan_results.scan_id
      and s.user_id = auth.uid()
  )
);

-- =========================================================
-- POLICIES: scan_events
-- =========================================================

drop policy if exists "scan_events_select_own" on public.scan_events;
create policy "scan_events_select_own"
on public.scan_events
for select
to authenticated
using (
  exists (
    select 1
    from public.scans s
    where s.id = scan_events.scan_id
      and s.user_id = auth.uid()
  )
);

-- =========================================================
-- PUBLIC ACCESS POLICIES (MVP)
-- =========================================================
-- Permiten lectura pública de resultados de scan via public_token
-- El worker actualiza con service role key
-- El cliente web sirve informes públicos sin requerir login

drop policy if exists "scans_select_public" on public.scans;
create policy "scans_select_public"
on public.scans
for select
to anon, authenticated
using (true);

drop policy if exists "scan_results_select_public" on public.scan_results;
create policy "scan_results_select_public"
on public.scan_results
for select
to anon, authenticated
using (true);

drop policy if exists "scan_events_select_public" on public.scan_events;
create policy "scan_events_select_public"
on public.scan_events
for select
to anon, authenticated
using (true);

-- =========================================================
-- NOTES
-- =========================================================
-- MVP Strategy:
-- - Scans pueden crearse sin auth (service role en API route)
-- - Resultados son públicos via public_token
-- - Auth real (Supabase Auth) se agrega en fase posterior
-- - RLS interno mantiene aislamiento si se activa auth later

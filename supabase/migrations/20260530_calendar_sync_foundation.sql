create table if not exists public.calendar_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  display_name text not null,
  sync_enabled boolean not null default true,
  sync_url text,
  username text,
  secret_name text,
  calendar_identifier text,
  sync_past_days integer not null default 30,
  sync_future_days integer not null default 180,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_sources_provider_check check (provider in ('icloud', 'caldav', 'google', 'outlook')),
  constraint calendar_sources_sync_days_check check (sync_past_days >= 0 and sync_future_days >= 0),
  constraint calendar_sources_status_check check (last_sync_status is null or last_sync_status in ('idle', 'success', 'partial', 'error'))
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.calendar_sources(id) on delete cascade,
  provider text not null,
  external_event_id text not null,
  external_uid text,
  recurrence_instance_id text not null default '',
  calendar_name text,
  title text not null,
  description text,
  location text,
  start_at timestamptz,
  end_at timestamptz,
  start_date date,
  end_date date,
  all_day boolean not null default false,
  timezone text,
  attendees jsonb not null default '[]'::jsonb,
  status text not null default 'confirmed',
  is_cancelled boolean not null default false,
  is_deleted boolean not null default false,
  raw_payload jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_status_check check (status in ('confirmed', 'tentative', 'cancelled', 'unknown')),
  constraint calendar_events_time_presence_check check (
    (all_day = true and start_date is not null)
    or
    (all_day = false and start_at is not null)
  )
);

create unique index if not exists idx_calendar_events_unique_external
  on public.calendar_events (provider, source_id, external_event_id, recurrence_instance_id);

create index if not exists idx_calendar_sources_enabled on public.calendar_sources(sync_enabled);
create index if not exists idx_calendar_events_source_id on public.calendar_events(source_id);
create index if not exists idx_calendar_events_provider on public.calendar_events(provider);
create index if not exists idx_calendar_events_start_at on public.calendar_events(start_at);
create index if not exists idx_calendar_events_start_date on public.calendar_events(start_date);
create index if not exists idx_calendar_events_deleted on public.calendar_events(is_deleted);

alter table public.calendar_sources enable row level security;
alter table public.calendar_events enable row level security;

drop policy if exists "Allow all calendar_sources" on public.calendar_sources;
create policy "Allow all calendar_sources" on public.calendar_sources for all to authenticated, anon using (true) with check (true);

drop policy if exists "Allow all calendar_events" on public.calendar_events;
create policy "Allow all calendar_events" on public.calendar_events for all to authenticated, anon using (true) with check (true);

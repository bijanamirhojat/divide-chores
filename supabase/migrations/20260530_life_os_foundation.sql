create extension if not exists pgcrypto;

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  linked_user_id uuid references public.users(id) on delete set null,
  name text not null,
  relationship text,
  birthdate date,
  notes text,
  email text,
  phone text,
  contact_information jsonb,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.life_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'general',
  event_date date not null,
  recurrence_type text not null default 'none',
  custom_recurrence jsonb,
  reminder_days integer[] not null default '{}',
  notes text,
  area_id uuid references public.areas(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint life_events_recurrence_type_check check (recurrence_type in ('none', 'yearly', 'monthly', 'custom')),
  constraint life_events_status_check check (status in ('active', 'completed', 'cancelled', 'archived'))
);

create table if not exists public.life_event_people (
  life_event_id uuid not null references public.life_events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (life_event_id, person_id)
);

create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'general',
  tags text[] not null default '{}',
  area_id uuid references public.areas(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.tasks add column if not exists area_id uuid references public.areas(id) on delete set null;

create table if not exists public.task_people (
  task_id uuid not null references public.tasks(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (task_id, person_id)
);

create index if not exists idx_people_name on public.people(name);
create index if not exists idx_people_tags on public.people using gin(tags);
create index if not exists idx_life_events_event_date on public.life_events(event_date);
create index if not exists idx_life_events_area_id on public.life_events(area_id);
create index if not exists idx_knowledge_entries_category on public.knowledge_entries(category);
create index if not exists idx_knowledge_entries_tags on public.knowledge_entries using gin(tags);
create index if not exists idx_tasks_area_id on public.tasks(area_id);

alter table public.areas enable row level security;
alter table public.people enable row level security;
alter table public.life_events enable row level security;
alter table public.life_event_people enable row level security;
alter table public.knowledge_entries enable row level security;
alter table public.api_tokens enable row level security;
alter table public.task_people enable row level security;

drop policy if exists "Allow all areas" on public.areas;
create policy "Allow all areas" on public.areas for all to authenticated, anon using (true) with check (true);

drop policy if exists "Allow all people" on public.people;
create policy "Allow all people" on public.people for all to authenticated, anon using (true) with check (true);

drop policy if exists "Allow all life_events" on public.life_events;
create policy "Allow all life_events" on public.life_events for all to authenticated, anon using (true) with check (true);

drop policy if exists "Allow all life_event_people" on public.life_event_people;
create policy "Allow all life_event_people" on public.life_event_people for all to authenticated, anon using (true) with check (true);

drop policy if exists "Allow all knowledge_entries" on public.knowledge_entries;
create policy "Allow all knowledge_entries" on public.knowledge_entries for all to authenticated, anon using (true) with check (true);

drop policy if exists "Service role manages api_tokens" on public.api_tokens;
create policy "Service role manages api_tokens" on public.api_tokens for all to authenticated using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Allow all task_people" on public.task_people;
create policy "Allow all task_people" on public.task_people for all to authenticated, anon using (true) with check (true);

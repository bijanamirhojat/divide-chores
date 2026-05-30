create table if not exists public.inbound_mail (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  from_name text,
  from_email text,
  to_email text,
  original_from_name text,
  original_from_email text,
  subject text not null,
  text_body text,
  html_body text,
  stripped_text_body text,
  attachments_json jsonb not null default '[]'::jsonb,
  message_id text,
  received_at timestamptz not null default now(),
  processed boolean not null default false,
  processed_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inbound_mail_processed on public.inbound_mail(processed);
create index if not exists idx_inbound_mail_received_at on public.inbound_mail(received_at desc);
create index if not exists idx_inbound_mail_source on public.inbound_mail(source);
create index if not exists idx_inbound_mail_message_id on public.inbound_mail(message_id);

alter table public.inbound_mail enable row level security;

drop policy if exists "Service role manages inbound_mail" on public.inbound_mail;
create policy "Service role manages inbound_mail" on public.inbound_mail
  for all to authenticated
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

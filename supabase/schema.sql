-- Run this once in Supabase: SQL Editor > New query > Run

create table reports (
  id uuid primary key default gen_random_uuid(),
  site text not null,
  technician text,
  job text,
  created_at timestamptz default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  stage text not null check (stage in ('BEFORE','DURING','AFTER')),
  path text not null,
  created_at timestamptz default now()
);

alter table reports enable row level security;
alter table photos enable row level security;

-- Open access (no login): anyone can add and view, nobody can edit or delete
create policy "open insert reports" on reports for insert to anon with check (true);
create policy "open read reports"   on reports for select to anon using (true);
create policy "open insert photos"  on photos  for insert to anon with check (true);
create policy "open read photos"    on photos  for select to anon using (true);

insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

create policy "open upload photos" on storage.objects
  for insert to anon with check (bucket_id = 'report-photos');

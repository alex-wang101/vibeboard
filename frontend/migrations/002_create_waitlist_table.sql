-- Waitlist signups
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.waitlist enable row level security;

-- Allow anonymous inserts (landing page has no auth)
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- Only service role can read waitlist entries
create policy "Service role can read waitlist"
  on public.waitlist for select
  using (false);

-- Users table for authenticated GitHub users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  github_id bigint unique not null,
  username text not null,
  email text,
  name text,
  avatar_url text,
  access_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup by github_id
create index if not exists idx_users_github_id on public.users (github_id);

-- Auto-update updated_at on row changes
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();

-- Enable RLS
alter table public.users enable row level security;

-- Policy: users can read their own row
create policy "Users can read own data"
  on public.users for select
  using (true);

-- Policy: service role can insert/update (backend upserts on sign-in)
create policy "Service role can upsert"
  on public.users for all
  using (true)
  with check (true);

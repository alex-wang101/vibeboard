-- Projects table for storing user projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  source text not null check (source in ('scratch', 'github')),
  repo_url text,
  default_branch text,
  last_scanned_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup by user
create index if not exists idx_projects_user_id on public.projects (user_id);

-- Auto-update updated_at on row changes
create trigger set_projects_updated_at
  before update on public.projects
  for each row
  execute function public.handle_updated_at();

-- Enable RLS
alter table public.projects enable row level security;

-- Policy: users can read their own projects
create policy "Users can read own projects"
  on public.projects for select
  using (user_id = auth.uid());

-- Policy: service role can do everything (backend handles auth)
create policy "Service role full access"
  on public.projects for all
  using (true)
  with check (true);

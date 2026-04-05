-- Architecture graphs for scanned/designed projects
create table if not exists public.architectures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid unique not null references public.projects(id) on delete cascade,
  repo_url text,
  branch text,
  scanned_at timestamptz,
  last_modified_at timestamptz default now(),
  graph jsonb not null,                -- Full ArchitectureGraph (root + edges + skippedImports)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup by project
create index if not exists idx_architectures_project_id on public.architectures (project_id);

-- Auto-update updated_at on row changes
create trigger set_architectures_updated_at
  before update on public.architectures
  for each row
  execute function public.handle_updated_at();

-- Enable RLS
alter table public.architectures enable row level security;

-- Policy: users can read architectures for their own projects
create policy "Users can read own architectures"
  on public.architectures for select
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

-- Policy: service role can do everything (backend handles auth)
create policy "Service role full access on architectures"
  on public.architectures for all
  using (true)
  with check (true);

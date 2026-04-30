-- Migration 007: Add enrichment JSONB column to project_scans and
-- enrichment_state to projects. This supports the VibeBoard Architect
-- agent's annotation layer (semantic labels, groupings, flows).

alter table project_scans
  add column if not exists enrichment jsonb,
  add column if not exists graph_hash text;

create index if not exists idx_project_scans_graph_hash
  on project_scans (graph_hash);

alter table projects
  add column if not exists enrichment_state text
  default 'uninitialized'
  check (enrichment_state in ('uninitialized', 'fresh', 'stale'));

comment on column project_scans.enrichment is
  'LLM-generated semantic overlay (NodeAnnotation, EdgeAnnotation, groups, flows, overviewNodeIds). See shared/src/types.ts::Enrichment.';
comment on column project_scans.graph_hash is
  'SHA256 of the structural graph. Used to cache-check enrichment and skip re-enrichment on unchanged re-scans.';
comment on column projects.enrichment_state is
  'uninitialized = never enriched; fresh = enrichment matches current scan; stale = scan changed materially, re-enrich recommended.';

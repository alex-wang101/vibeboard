-- Migration 008: Per-user LLM configuration for the enricher.
-- Users choose between Anthropic (cloud, bring-your-own-key) and
-- Ollama (local, free). Anthropic key is encrypted at rest using the
-- same AES-256-GCM scheme as access tokens.

alter table public.users
  add column if not exists llm_provider text
    default 'ollama'
    check (llm_provider in ('anthropic', 'ollama')),
  add column if not exists anthropic_api_key_encrypted text,
  add column if not exists ollama_host text,
  add column if not exists llm_explain_model text,
  add column if not exists llm_annotate_model text;

comment on column public.users.llm_provider is
  'User preference: anthropic (BYOK cloud) or ollama (local).';
comment on column public.users.anthropic_api_key_encrypted is
  'AES-256-GCM encrypted Anthropic API key. Only present when llm_provider = anthropic.';
comment on column public.users.ollama_host is
  'Override for Ollama endpoint. Defaults to http://localhost:11434 when null.';

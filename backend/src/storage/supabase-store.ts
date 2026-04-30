import { supabase } from '../lib/supabase';
import {
  encryptToken,
  decryptToken,
} from '@vibeboard/shared';
import type {
  Project,
  ArchitectureGraph,
  Enrichment,
  EnrichmentState,
  UserLLMConfig,
  LLMProvider,
} from '@vibeboard/shared';

// ============================================================
// In-memory TTL cache
// Backend is a single process — Map-based cache is sufficient.
// If we scale horizontally, swap for Redis keyed the same way.
// ============================================================

const PROJECT_TTL_MS = 60_000;       // 60s — individual project reads
const PROJECT_LIST_TTL_MS = 30_000;  // 30s — per-user list (shorter since it's a broader set)

interface CacheEntry<T> { value: T; expiresAt: number }

const projectCache = new Map<string, CacheEntry<Project | null>>();   // key: projectId
const projectListCache = new Map<string, CacheEntry<Project[]>>();    // key: userId

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = map.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    map.delete(key);
    return undefined;
  }
  return hit.value;
}

function setCached<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttl: number): void {
  map.set(key, { value, expiresAt: Date.now() + ttl });
}

function invalidateProject(projectId: string, userId?: string): void {
  projectCache.delete(projectId);
  if (userId) {
    projectListCache.delete(userId);
  } else {
    // Unknown userId (e.g. on delete where we only have projectId) — nuke all lists.
    projectListCache.clear();
  }
}

export function clearProjectCache(): void {
  projectCache.clear();
  projectListCache.clear();
}

// ============================================================
// Projects
// ============================================================

export async function getProjects(userId: string): Promise<Project[]> {
  const cached = getCached(projectListCache, userId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
  const projects = (data ?? []).map(rowToProject);

  setCached(projectListCache, userId, projects, PROJECT_LIST_TTL_MS);
  // Warm per-project cache too — saves a round-trip on the immediate drill-in.
  for (const p of projects) setCached(projectCache, p.id, p, PROJECT_TTL_MS);

  return projects;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const cached = getCached(projectCache, projectId);
  if (cached !== undefined) return cached;

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    setCached(projectCache, projectId, null, PROJECT_TTL_MS);
    return null;
  }
  const project = rowToProject(data);
  setCached(projectCache, projectId, project, PROJECT_TTL_MS);
  return project;
}

export async function createProject(project: Project): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      id: project.id,
      user_id: project.userId,
      name: project.name,
      source: project.source,
      repo_url: project.repoUrl,
      default_branch: project.defaultBranch,
      last_scanned_at: project.lastScannedAt,
      contributors: project.contributors ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create project: ${error.message}`);
  const created = rowToProject(data);
  invalidateProject(created.id, created.userId);
  setCached(projectCache, created.id, created, PROJECT_TTL_MS);
  return created;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, 'lastScannedAt' | 'name' | 'contributors'>>
): Promise<Project | null> {
  const row: Record<string, unknown> = {};
  if (updates.lastScannedAt !== undefined) row.last_scanned_at = updates.lastScannedAt;
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.contributors !== undefined) row.contributors = updates.contributors;

  const { data, error } = await supabase
    .from('projects')
    .update(row)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update project: ${error.message}`);
  if (!data) return null;
  const updated = rowToProject(data);
  invalidateProject(updated.id, updated.userId);
  setCached(projectCache, updated.id, updated, PROJECT_TTL_MS);
  return updated;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const existing = getCached(projectCache, projectId);
  const userId = existing?.userId;

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) return false;
  invalidateProject(projectId, userId);
  return true;
}

// ============================================================
// Architectures
// ============================================================

export async function getArchitecture(projectId: string): Promise<ArchitectureGraph | null> {
  const { data, error } = await supabase
    .from('project_scans')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error || !data) return null;
  const graph = data.graph as ArchitectureGraph;
  if (data.enrichment) {
    graph.enrichment = data.enrichment as Enrichment;
  }
  return graph;
}

export async function getEnrichment(projectId: string): Promise<Enrichment | null> {
  const { data, error } = await supabase
    .from('project_scans')
    .select('enrichment')
    .eq('project_id', projectId)
    .single();

  if (error || !data) return null;
  return (data.enrichment as Enrichment) ?? null;
}

export async function saveArchitecture(
  projectId: string,
  graph: ArchitectureGraph,
  repoUrl?: string,
  branch?: string
): Promise<void> {
  const { error } = await supabase
    .from('project_scans')
    .upsert({
      project_id: projectId,
      graph,
      enrichment: graph.enrichment ?? null,
      graph_hash: graph.enrichment?.graphHash ?? null,
      repo_url: repoUrl ?? null,
      branch: branch ?? null,
      scanned_at: new Date().toISOString(),
      last_modified_at: new Date().toISOString(),
    }, { onConflict: 'project_id' });

  if (error) throw new Error(`Failed to save architecture: ${error.message}`);
}

export async function setEnrichmentState(
  projectId: string,
  state: EnrichmentState
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ enrichment_state: state })
    .eq('id', projectId);
  if (error) throw new Error(`Failed to set enrichment_state: ${error.message}`);
}

// ============================================================
// Per-user LLM config
// Anthropic key is encrypted with the same AES-256-GCM scheme
// used for GitHub access tokens.
// ============================================================

interface UserConfigCacheEntry {
  config: UserLLMConfig | null;
  expiresAt: number;
}
const userConfigCache = new Map<string, UserConfigCacheEntry>();
const USER_CONFIG_TTL_MS = 5 * 60_000;

function getEncryptionKey(): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is not set');
  return key;
}

export async function getUserLLMConfig(userId: string): Promise<UserLLMConfig | null> {
  const hit = userConfigCache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.config;

  const { data, error } = await supabase
    .from('users')
    .select('llm_provider, anthropic_api_key_encrypted, ollama_host, llm_explain_model, llm_annotate_model')
    .eq('id', userId)
    .single();

  if (error || !data) {
    userConfigCache.set(userId, { config: null, expiresAt: Date.now() + USER_CONFIG_TTL_MS });
    return null;
  }

  const provider = (data.llm_provider as LLMProvider | null) ?? 'ollama';
  let anthropicApiKey: string | undefined;
  if (provider === 'anthropic' && data.anthropic_api_key_encrypted) {
    try {
      anthropicApiKey = decryptToken(data.anthropic_api_key_encrypted as string, getEncryptionKey());
    } catch {
      anthropicApiKey = undefined;
    }
  }

  const config: UserLLMConfig = {
    provider,
    anthropicApiKey,
    ollamaHost: (data.ollama_host as string | null) ?? undefined,
    explainModel: (data.llm_explain_model as string | null) ?? undefined,
    annotateModel: (data.llm_annotate_model as string | null) ?? undefined,
  };

  userConfigCache.set(userId, { config, expiresAt: Date.now() + USER_CONFIG_TTL_MS });
  return config;
}

export async function saveUserLLMConfig(
  userId: string,
  config: UserLLMConfig
): Promise<void> {
  const row: Record<string, unknown> = {
    llm_provider: config.provider,
    ollama_host: config.ollamaHost ?? null,
    llm_explain_model: config.explainModel ?? null,
    llm_annotate_model: config.annotateModel ?? null,
  };

  if (config.provider === 'anthropic' && config.anthropicApiKey) {
    row.anthropic_api_key_encrypted = encryptToken(config.anthropicApiKey, getEncryptionKey());
  } else if (config.provider === 'ollama') {
    // Clear any previously-stored key when switching away from anthropic.
    row.anthropic_api_key_encrypted = null;
  }

  const { error } = await supabase
    .from('users')
    .update(row)
    .eq('id', userId);

  if (error) throw new Error(`Failed to save LLM config: ${error.message}`);
  userConfigCache.delete(userId);
}

// ============================================================
// Helpers
// ============================================================

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    source: row.source as 'github' | 'scratch',
    repoUrl: row.repo_url as string | null,
    defaultBranch: row.default_branch as string | null,
    lastScannedAt: row.last_scanned_at as string | null,
    contributors: (row.contributors as { name: string; email: string }[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

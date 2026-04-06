import { supabase } from '../lib/supabase';
import type { Project, ArchitectureGraph } from '@vibeboard/shared';

// ============================================================
// Projects
// ============================================================

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
  return (data ?? []).map(rowToProject);
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !data) return null;
  return rowToProject(data);
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
  return rowToProject(data);
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
  return data ? rowToProject(data) : null;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  return !error;
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
  return data.graph as ArchitectureGraph;
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
      repo_url: repoUrl ?? null,
      branch: branch ?? null,
      scanned_at: new Date().toISOString(),
      last_modified_at: new Date().toISOString(),
    }, { onConflict: 'project_id' });

  if (error) throw new Error(`Failed to save architecture: ${error.message}`);
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

import axios from 'axios';
import type {
  Project,
  CreateProjectRequest,
  ScanRequest,
  ScanResponse,
  ArchitectureGraph,
  GitHubRepo,
} from '@vibeboard/shared';

// All requests go through the Next.js API proxy at /api/proxy/*
// The proxy reads the httpOnly NextAuth cookie server-side,
// extracts the user's GitHub ID, and forwards it to the backend.
// No tokens are ever exposed to client-side JavaScript.
const api = axios.create({
  baseURL: '/api/proxy',
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// API client
// ============================================================

export async function getProjects(): Promise<Project[]> {
  const { data } = await api.get('/projects');
  return data.data;
}

export async function createProject(req: CreateProjectRequest): Promise<Project> {
  const { data } = await api.post('/projects', req);
  return data.data;
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await api.get(`/projects/${id}`);
  return data.data;
}

export async function scanRepo(req: ScanRequest): Promise<ScanResponse> {
  const { data } = await api.post('/scan', req);
  return data.data;
}

export async function getScanStatus(projectId: string): Promise<ScanResponse> {
  const { data } = await api.get(`/scan/${projectId}/status`);
  return data.data;
}

export async function getArchitecture(projectId: string): Promise<ArchitectureGraph> {
  const { data } = await api.get(`/architecture/${projectId}`);
  return data.data;
}

export async function saveArchitecture(
  projectId: string,
  graph: ArchitectureGraph
): Promise<void> {
  await api.put(`/architecture/${projectId}`, graph);
}

export async function listGitHubRepos(): Promise<GitHubRepo[]> {
  const { data } = await api.get('/github/repos');
  return data.data;
}

export async function listBranches(owner: string, repo: string): Promise<string[]> {
  const { data } = await api.get(`/github/repos/${owner}/${repo}/branches`);
  return data.data;
}

export default api;

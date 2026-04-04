import axios from 'axios';
import type {
  Project,
  CreateProjectRequest,
  ScanRequest,
  ScanResponse,
  ArchitectureGraph,
  GitHubRepo,
} from '@vibeboard/shared';

// Axios instance pointing to the backend
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
});

// TODO: Attach the GitHub access token from the NextAuth session
// to every request via an interceptor:
//
// api.interceptors.request.use(async (config) => {
//   const session = await getSession();
//   if (session?.accessToken) {
//     config.headers.Authorization = `Bearer ${session.accessToken}`;
//   }
//   return config;
// });

// ============================================================
// API client functions — all return placeholder types for now
// ============================================================

export async function getProjects(): Promise<Project[]> {
  // TODO: const { data } = await api.get('/projects');
  return [];
}

export async function createProject(req: CreateProjectRequest): Promise<Project> {
  // TODO: const { data } = await api.post('/projects', req);
  throw new Error('createProject not implemented');
}

export async function getProject(id: string): Promise<Project> {
  // TODO: const { data } = await api.get(`/projects/${id}`);
  throw new Error(`getProject(${id}) not implemented`);
}

export async function scanRepo(req: ScanRequest): Promise<ScanResponse> {
  // TODO: const { data } = await api.post('/scan', req);
  throw new Error('scanRepo not implemented');
}

export async function getScanStatus(projectId: string): Promise<ScanResponse> {
  // TODO: const { data } = await api.get(`/scan/${projectId}/status`);
  throw new Error(`getScanStatus(${projectId}) not implemented`);
}

export async function getArchitecture(projectId: string): Promise<ArchitectureGraph> {
  // TODO: const { data } = await api.get(`/architecture/${projectId}`);
  throw new Error(`getArchitecture(${projectId}) not implemented`);
}

export async function saveArchitecture(
  projectId: string,
  graph: ArchitectureGraph
): Promise<void> {
  // TODO: await api.put(`/architecture/${projectId}`, graph);
  throw new Error(`saveArchitecture(${projectId}) not implemented`);
}

export async function listGitHubRepos(): Promise<GitHubRepo[]> {
  // TODO: const { data } = await api.get('/github/repos');
  return [];
}

export async function listBranches(owner: string, repo: string): Promise<string[]> {
  // TODO: const { data } = await api.get(`/github/repos/${owner}/${repo}/branches`);
  return [];
}

export default api;

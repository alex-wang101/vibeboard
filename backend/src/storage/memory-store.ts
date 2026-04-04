import type { Project, ArchitectureGraph } from '@vibeboard/shared';

// TODO: Simple in-memory store for MVP
// All data is lost on server restart — this is fine for development
// Replace with SQLite/Postgres later

const projects = new Map<string, Project>();
const architectures = new Map<string, ArchitectureGraph>();

export function getProjects(userId: string): Project[] {
  return Array.from(projects.values()).filter((p) => p.userId === userId);
}

export function getProject(projectId: string): Project | undefined {
  return projects.get(projectId);
}

export function createProject(project: Project): Project {
  projects.set(project.id, project);
  return project;
}

export function deleteProject(projectId: string): boolean {
  architectures.delete(projectId);
  return projects.delete(projectId);
}

export function getArchitecture(projectId: string): ArchitectureGraph | undefined {
  return architectures.get(projectId);
}

export function saveArchitecture(projectId: string, graph: ArchitectureGraph): void {
  architectures.set(projectId, graph);
}

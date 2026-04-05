import { Router } from 'express';
import crypto from 'crypto';
import { githubAuth } from '../middleware/github-auth';
import { getProjects, getProject, createProject, deleteProject } from '../storage/memory-store';
import type { Project } from '@vibeboard/shared';

export const projectsRouter = Router();

projectsRouter.use(githubAuth);

// GET /projects — returns user's projects
projectsRouter.get('/', (req, res) => {
  const projects = getProjects(req.userId!);
  res.json({ data: projects });
});

// POST /projects — creates a project
projectsRouter.post('/', (req, res) => {
  const { name, source, repoUrl, branch } = req.body;

  if (!name || !source) {
    res.status(400).json({ error: 'name and source are required' });
    return;
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    source,
    repoUrl: repoUrl ?? null,
    defaultBranch: branch ?? null,
    lastScannedAt: null,
    createdAt: now,
    updatedAt: now,
    userId: req.userId!,
  };

  createProject(project);
  res.status(201).json({ data: project });
});

// GET /projects/:id — returns a single project
projectsRouter.get('/:id', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ data: project });
});

// DELETE /projects/:id — deletes a project
projectsRouter.delete('/:id', (req, res) => {
  const deleted = deleteProject(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ message: 'Deleted' });
});

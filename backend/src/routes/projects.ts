import { Router } from 'express';
import crypto from 'crypto';
import { githubAuth } from '../middleware/github-auth';
import { getProjects, getProject, createProject, updateProject, deleteProject } from '../storage/supabase-store';
import type { Project } from '@vibeboard/shared';

export const projectsRouter = Router();

projectsRouter.use(githubAuth);

// GET /projects — returns user's projects
projectsRouter.get('/', async (req, res) => {
  try {
    const projects = await getProjects(req.userId!);
    res.json({ data: projects });
  } catch (err) {
    console.error('[VibeBoard] Failed to fetch projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /projects — creates a project
projectsRouter.post('/', async (req, res) => {
  const { name, source, repoUrl, branch, contributors } = req.body;

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
    contributors: contributors ?? [],
    createdAt: now,
    updatedAt: now,
    userId: req.userId!,
  };

  try {
    const created = await createProject(project);
    res.status(201).json({ data: created });
  } catch (err) {
    console.error('[VibeBoard] Failed to create project:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /projects/:id — returns a single project
projectsRouter.get('/:id', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ data: project });
  } catch (err) {
    console.error('[VibeBoard] Failed to fetch project:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PATCH /projects/:id — updates a project (name, contributors)
projectsRouter.patch('/:id', async (req, res) => {
  try {
    const { name, contributors } = req.body;
    const updated = await updateProject(req.params.id, { name, contributors });
    if (!updated) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ data: updated });
  } catch (err) {
    console.error('[VibeBoard] Failed to update project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /projects/:id — deletes a project
projectsRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteProject(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[VibeBoard] Failed to delete project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

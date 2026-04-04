import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';

export const projectsRouter = Router();

// All routes require GitHub auth
projectsRouter.use(githubAuth);

// GET /projects — returns user's projects from memory store
projectsRouter.get('/', (_req, res) => {
  // TODO: Fetch projects from memory store filtered by authenticated user
  res.json({ data: [], message: 'Projects list — not yet implemented' });
});

// POST /projects — creates a project
projectsRouter.post('/', (req, res) => {
  // TODO: Create project in memory store
  // Body: { name: string, source: 'scratch' | 'github', repoUrl?: string, branch?: string }
  const { name, source } = req.body;
  res.json({
    data: { id: 'placeholder-id', name, source },
    message: 'Project creation — not yet implemented',
  });
});

// GET /projects/:id — returns a single project
projectsRouter.get('/:id', (req, res) => {
  // TODO: Fetch project by ID from memory store
  res.json({ data: null, message: `Project ${req.params.id} — not yet implemented` });
});

// DELETE /projects/:id — deletes a project
projectsRouter.delete('/:id', (req, res) => {
  // TODO: Delete project from memory store
  res.json({ message: `Project ${req.params.id} deleted — not yet implemented` });
});

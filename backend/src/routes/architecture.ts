import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';
import { getArchitecture, saveArchitecture } from '../storage/memory-store';

export const architectureRouter = Router();

architectureRouter.use(githubAuth);

// GET /architecture/:projectId — returns the ArchitectureGraph for a project
architectureRouter.get('/:projectId', (req, res) => {
  const graph = getArchitecture(req.params.projectId);
  if (!graph) {
    res.status(404).json({ error: 'Architecture not found' });
    return;
  }
  res.json({ data: graph });
});

// PUT /architecture/:projectId — saves an updated ArchitectureGraph
architectureRouter.put('/:projectId', (req, res) => {
  saveArchitecture(req.params.projectId, req.body);
  res.json({ message: 'Saved' });
});

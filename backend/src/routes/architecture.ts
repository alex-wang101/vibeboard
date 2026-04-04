import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';

export const architectureRouter = Router();

// All routes require GitHub auth
architectureRouter.use(githubAuth);

// GET /architecture/:projectId — returns the ArchitectureGraph for a project
architectureRouter.get('/:projectId', (req, res) => {
  // TODO: Fetch architecture graph from memory store by projectId
  res.json({
    data: null,
    message: `Architecture for project ${req.params.projectId} — not yet implemented`,
  });
});

// PUT /architecture/:projectId — saves an updated ArchitectureGraph
architectureRouter.put('/:projectId', (req, res) => {
  // TODO: Save the architecture graph to memory store
  // Body: ArchitectureGraph (from @vibeboard/shared)
  // This is called when users make manual edits on the canvas
  res.json({
    message: `Architecture for project ${req.params.projectId} saved — not yet implemented`,
  });
});

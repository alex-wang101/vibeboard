import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';
import { getArchitecture, saveArchitecture } from '../storage/supabase-store';

export const architectureRouter = Router();

architectureRouter.use(githubAuth);

// GET /architecture/:projectId — returns the ArchitectureGraph for a project
architectureRouter.get('/:projectId', async (req, res) => {
  try {
    const graph = await getArchitecture(req.params.projectId);
    if (!graph) {
      res.status(404).json({ error: 'Architecture not found' });
      return;
    }
    res.json({ data: graph });
  } catch (err) {
    console.error('[VibeBoard] Failed to fetch architecture:', err);
    res.status(500).json({ error: 'Failed to fetch architecture' });
  }
});

// PUT /architecture/:projectId — saves an updated ArchitectureGraph
architectureRouter.put('/:projectId', async (req, res) => {
  try {
    await saveArchitecture(req.params.projectId, req.body);
    res.json({ message: 'Saved' });
  } catch (err) {
    console.error('[VibeBoard] Failed to save architecture:', err);
    res.status(500).json({ error: 'Failed to save architecture' });
  }
});

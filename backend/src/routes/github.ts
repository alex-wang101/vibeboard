import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';
import { listUserRepos, listBranches } from '../services/github';

export const githubRouter = Router();

githubRouter.use(githubAuth);

// GET /github/repos — lists the authenticated user's GitHub repos
githubRouter.get('/repos', async (req, res) => {
  try {
    const repos = await listUserRepos(req.githubToken!);
    res.json({ data: repos });
  } catch (err) {
    console.error('[VibeBoard] Failed to list repos:', err);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// GET /github/repos/:owner/:repo/branches — lists branches for a specific repo
githubRouter.get('/repos/:owner/:repo/branches', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const branches = await listBranches(owner, repo, req.githubToken!);
    res.json({ data: branches });
  } catch (err) {
    console.error('[VibeBoard] Failed to list branches:', err);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

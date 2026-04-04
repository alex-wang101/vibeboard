import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';

export const githubRouter = Router();

// All routes require GitHub auth
githubRouter.use(githubAuth);

// GET /github/repos — lists the authenticated user's GitHub repos
githubRouter.get('/repos', (_req, res) => {
  // TODO: Use Octokit with user's token to list their repos
  // Include both owned repos and repos they have access to
  // Return: name, fullName, private, defaultBranch, description, url
  res.json({ data: [], message: 'GitHub repos list — not yet implemented' });
});

// GET /github/repos/:owner/:repo/branches — lists branches for a specific repo
githubRouter.get('/repos/:owner/:repo/branches', (req, res) => {
  // TODO: Use Octokit to list branches for the specified repo
  const { owner, repo } = req.params;
  res.json({
    data: [],
    message: `Branches for ${owner}/${repo} — not yet implemented`,
  });
});

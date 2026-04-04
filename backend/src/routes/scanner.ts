import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';

export const scannerRouter = Router();

// All routes require GitHub auth
scannerRouter.use(githubAuth);

// POST /scan — accepts { projectId, repoUrl, branch }, clones the repo, runs ts-morph scanner
scannerRouter.post('/', (_req, res) => {
  // TODO: Implementation steps:
  // 1. Validate request body: { projectId, repoUrl, branch }
  // 2. Clone the repo using services/github.ts (with user's token)
  // 3. Run ts-morph scanner using services/scanner.ts
  // 4. Store the resulting ArchitectureGraph in memory store
  // 5. Return the result
  //
  // NOTE: For MVP this is synchronous. Add a TODO for making it async
  // with status polling (POST returns a scan ID, GET /scan/:id for status)
  res.json({
    data: {
      projectId: 'placeholder',
      status: 'complete',
      architecture: null,
    },
    message: 'Scan — not yet implemented',
  });
});

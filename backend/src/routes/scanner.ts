import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';
import { cloneRepository, cleanupClone } from '../services/github';
import { scanRepository } from '../services/scanner';
import { getProject, saveArchitecture } from '../storage/memory-store';

export const scannerRouter = Router();

scannerRouter.use(githubAuth);

// POST /scan — clones a repo, scans the file tree, returns the architecture
scannerRouter.post('/', async (req, res) => {
  const { projectId, repoUrl, branch } = req.body;

  if (!projectId || !repoUrl || !branch) {
    res.status(400).json({ error: 'projectId, repoUrl, and branch are required' });
    return;
  }

  const project = getProject(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  let clonePath: string | null = null;

  try {
    clonePath = await cloneRepository(repoUrl, branch, req.githubToken!);
    const graph = await scanRepository(clonePath, repoUrl, branch);
    graph.projectId = projectId;

    saveArchitecture(projectId, graph);

    // Update project's lastScannedAt
    project.lastScannedAt = new Date().toISOString();
    project.updatedAt = project.lastScannedAt;

    res.json({
      data: {
        projectId,
        status: 'complete' as const,
        architecture: graph,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[VibeBoard] Scan failed:', message);
    res.json({
      data: {
        projectId,
        status: 'error' as const,
        error: message,
      },
    });
  } finally {
    if (clonePath) {
      await cleanupClone(clonePath).catch((err) =>
        console.error('[VibeBoard] Cleanup failed:', err)
      );
    }
  }
});

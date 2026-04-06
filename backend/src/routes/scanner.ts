import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';
import { cloneRepository, cleanupClone } from '../services/github';
import { scanRepository } from '../services/scanner';
import { getProject, saveArchitecture, updateProject } from '../storage/supabase-store';

export const scannerRouter = Router();

scannerRouter.use(githubAuth);

// POST /scan — clones a repo, scans the file tree, returns the architecture
scannerRouter.post('/', async (req, res) => {
  const { projectId, repoUrl, branch } = req.body;

  if (!projectId || !repoUrl || !branch) {
    res.status(400).json({ error: 'projectId, repoUrl, and branch are required' });
    return;
  }

  const project = await getProject(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  let clonePath: string | null = null;

  try {
    clonePath = await cloneRepository(repoUrl, branch, req.githubToken!, req.userId!, projectId);
    const graph = await scanRepository(clonePath, repoUrl, branch);
    graph.projectId = projectId;

    await saveArchitecture(projectId, graph, repoUrl, branch);
    await updateProject(projectId, { lastScannedAt: new Date().toISOString() });

    res.json({
      data: {
        projectId,
        status: 'complete' as const,
        architecture: graph,
        skippedImports: graph.skippedImports,
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

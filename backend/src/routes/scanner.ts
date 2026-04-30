import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';
import { cloneRepository, cleanupClone } from '../services/github';
import { scanRepository } from '../services/scanner';
import { enrichGraph } from '../services/enricher';
import {
  getEnrichment,
  getProject,
  getUserLLMConfig,
  saveArchitecture,
  setEnrichmentState,
  updateProject,
} from '../storage/supabase-store';
import type { UserLLMConfig } from '@vibeboard/shared';

export const scannerRouter = Router();

scannerRouter.use(githubAuth);

// POST /scan — clones a repo, scans the file tree, returns the architecture
scannerRouter.post('/', async (req, res) => {
  const { projectId, repoUrl, branch, llmOverride } = req.body as {
    projectId?: string;
    repoUrl?: string;
    branch?: string;
    // Per-scan override. When present, takes precedence over the
    // user's saved config (but is NOT persisted).
    llmOverride?: UserLLMConfig;
  };

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

    try {
      const savedConfig = await getUserLLMConfig(req.userId!);
      const llmConfig = llmOverride ?? savedConfig;
      if (!llmConfig) {
        console.log('[VibeBoard] No LLM config for user, skipping enrichment');
      } else {
        const prior = await getEnrichment(projectId);
        const result = await enrichGraph(graph, {
          projectName: project.name,
          repoUrl,
          repoDir: clonePath,
          priorEnrichment: prior,
          llmConfig,
        });
        if (result) {
          graph.enrichment = result.enrichment;
          await setEnrichmentState(projectId, 'fresh');
          console.log(
            `[VibeBoard] Enrichment ${result.cacheHit ? 'cache hit' : `generated in ${result.attempts} attempt(s)`} (provider=${llmConfig.provider})`
          );
        }
      }
    } catch (enrichErr) {
      const msg = enrichErr instanceof Error ? enrichErr.message : String(enrichErr);
      console.error('[VibeBoard] Enrichment failed (continuing without it):', msg);
      await setEnrichmentState(projectId, 'stale').catch(() => {});
    }

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

import { Router } from 'express';
import { githubAuth } from '../middleware/github-auth';
import { getUserLLMConfig, saveUserLLMConfig } from '../storage/supabase-store';
import type { UpdateLLMConfigRequest } from '@vibeboard/shared';

export const settingsRouter = Router();

settingsRouter.use(githubAuth);

// GET /settings/llm — returns the current user's LLM config.
// Never returns the decrypted API key; just whether one is set.
settingsRouter.get('/llm', async (req, res) => {
  try {
    const config = await getUserLLMConfig(req.userId!);
    res.json({
      data: {
        provider: config?.provider ?? 'ollama',
        hasAnthropicKey: !!config?.anthropicApiKey,
        ollamaHost: config?.ollamaHost ?? null,
        explainModel: config?.explainModel ?? null,
        annotateModel: config?.annotateModel ?? null,
      },
    });
  } catch (err) {
    console.error('[VibeBoard] Failed to load LLM config:', err);
    res.status(500).json({ error: 'Failed to load LLM config' });
  }
});

// PUT /settings/llm — update the user's LLM config.
settingsRouter.put('/llm', async (req, res) => {
  const body = req.body as UpdateLLMConfigRequest;

  if (!body?.provider || (body.provider !== 'anthropic' && body.provider !== 'ollama')) {
    res.status(400).json({ error: 'provider must be "anthropic" or "ollama"' });
    return;
  }
  if (body.provider === 'anthropic' && !body.anthropicApiKey) {
    // Allow the client to PUT without a key only if one is already stored.
    const existing = await getUserLLMConfig(req.userId!);
    if (!existing?.anthropicApiKey) {
      res.status(400).json({ error: 'anthropicApiKey is required when provider is "anthropic"' });
      return;
    }
  }

  try {
    await saveUserLLMConfig(req.userId!, {
      provider: body.provider,
      anthropicApiKey: body.anthropicApiKey,
      ollamaHost: body.ollamaHost,
      explainModel: body.explainModel,
      annotateModel: body.annotateModel,
    });
    res.json({ message: 'Saved' });
  } catch (err) {
    console.error('[VibeBoard] Failed to save LLM config:', err);
    res.status(500).json({ error: 'Failed to save LLM config' });
  }
});

import Anthropic from '@anthropic-ai/sdk';
import type { UserLLMConfig } from '@vibeboard/shared';

// ============================================================
// Provider-agnostic LLM client.
// Config is passed per-call (loaded from user's Supabase row by
// the route handler). No env reads here — keeps it testable and
// lets a single backend process serve users on different providers.
// ============================================================

export interface LLMSystemBlock {
  text: string;
  cacheable?: boolean;   // Anthropic-only; Ollama ignores.
}

export interface LLMToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LLMCallOptions {
  config: UserLLMConfig;
  model: string;            // Anthropic model id, or Ollama model tag
  system: LLMSystemBlock[];
  userMessage: string;
  tools?: LLMToolDef[];
  forceTool?: string;       // Name of tool the model MUST call
  maxTokens?: number;
}

export interface LLMResult {
  text?: string;
  toolUse?: { name: string; input: Record<string, unknown> };
}

// ============================================================
// Entry point
// ============================================================

export async function callLLM(opts: LLMCallOptions): Promise<LLMResult> {
  if (opts.config.provider === 'ollama') return callOllama(opts);
  return callAnthropic(opts);
}

// ============================================================
// Anthropic
// ============================================================

async function callAnthropic(opts: LLMCallOptions): Promise<LLMResult> {
  const apiKey = opts.config.anthropicApiKey;
  if (!apiKey) throw new Error('Anthropic provider selected but no api key configured for user');
  const client = new Anthropic({ apiKey });
  const system = opts.system.map(s =>
    s.cacheable
      ? { type: 'text' as const, text: s.text, cache_control: { type: 'ephemeral' as const } }
      : { type: 'text' as const, text: s.text }
  );

  const req: any = {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2048,
    system,
    messages: [{ role: 'user', content: opts.userMessage }],
  };

  if (opts.tools?.length) {
    req.tools = opts.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));
    if (opts.forceTool) {
      req.tool_choice = { type: 'tool', name: opts.forceTool };
    }
  }

  const resp = await client.messages.create(req);
  const toolBlock = resp.content.find(b => b.type === 'tool_use');
  if (toolBlock && toolBlock.type === 'tool_use') {
    return { toolUse: { name: toolBlock.name, input: toolBlock.input as Record<string, unknown> } };
  }
  const textBlock = resp.content.find(b => b.type === 'text');
  if (textBlock && textBlock.type === 'text') return { text: textBlock.text };
  return {};
}

// ============================================================
// Ollama (local) — /api/chat
// Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
// ============================================================

interface OllamaChatResponse {
  message?: {
    role: string;
    content: string;
    tool_calls?: Array<{
      function: { name: string; arguments: Record<string, unknown> };
    }>;
  };
}

async function callOllama(opts: LLMCallOptions): Promise<LLMResult> {
  const host = opts.config.ollamaHost ?? 'http://localhost:11434';
  // Ollama has one system string; concatenate all blocks (cache_control is a no-op).
  const systemText = opts.system.map(s => s.text).join('\n\n');

  const body: Record<string, unknown> = {
    model: opts.model,
    stream: false,
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: opts.userMessage },
    ],
    options: {
      num_ctx: Number(process.env.OLLAMA_NUM_CTX ?? 32768),
      temperature: 0.2,
    },
  };

  if (opts.tools?.length) {
    body.tools = opts.tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));
    // Ollama has no `tool_choice: required` equivalent — we rely on the
    // system prompt's "respond only via tool" directive + the retry loop.
  }

  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  const msg = data.message;
  if (!msg) return {};

  if (msg.tool_calls?.length) {
    const call = msg.tool_calls[0];
    const args = call.function.arguments;
    // Small Ollama models sometimes return arguments as a JSON string.
    const normalized = typeof args === 'string' ? JSON.parse(args) : args;
    return { toolUse: { name: call.function.name, input: normalized as Record<string, unknown> } };
  }

  // Some local models miss tool-use and dump JSON in content. Try to recover.
  if (opts.forceTool && msg.content) {
    const maybe = tryExtractJsonObject(msg.content);
    if (maybe) {
      return { toolUse: { name: opts.forceTool, input: maybe } };
    }
  }

  return { text: msg.content ?? '' };
}

function tryExtractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const candidate = fenced?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

// ============================================================
// Default model ids for each provider (used by enricher).
// ============================================================

const DEFAULTS = {
  ollama: { explain: 'qwen2.5-coder:14b', annotate: 'qwen2.5-coder:14b' },
  anthropic: { explain: 'claude-opus-4-5', annotate: 'claude-sonnet-4-5' },
};

export function resolveExplainModel(config: UserLLMConfig): string {
  return config.explainModel ?? DEFAULTS[config.provider].explain;
}

export function resolveAnnotateModel(config: UserLLMConfig): string {
  return config.annotateModel ?? DEFAULTS[config.provider].annotate;
}

export function isConfigured(config: UserLLMConfig | null): boolean {
  if (!config) return false;
  if (config.provider === 'ollama') return true;      // user is responsible for running ollama
  return !!config.anthropicApiKey;
}

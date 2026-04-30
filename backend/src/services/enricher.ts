import fs from 'fs';
import path from 'path';
import {
  BASE_ARCHITECT_PROMPT,
  MODE_ANNOTATE,
  MODE_ANNOTATE_STRUCTURED,
  buildWorldModelBlock
} from '@vibeboard/shared';
import type { ArchitectureGraph, Enrichment, UserLLMConfig } from '@vibeboard/shared';
import { hashArchitectureGraph } from './graph-hash.js';
import {
  EMIT_ENRICHMENT_TOOL,
  buildCandidateLists,
  renderCandidateLists,
  renderCompressedTree,
  renderEdgeCensus,
  selectSignalFiles
} from './enricher-prompts.js';
import {
  callLLM,
  isConfigured,
  resolveAnnotateModel,
  resolveExplainModel,
} from './llm-client.js';

const ENRICHER_VERSION = '0.1.0';
const MAX_ATTEMPTS = 3;

export interface EnrichOptions {
  projectName: string;
  repoUrl: string | null;
  repoDir?: string;                  // absolute path to cloned repo, for signal files + readme + package.json
  priorEnrichment?: Enrichment | null;
  force?: boolean;
  llmConfig: UserLLMConfig;
}

export interface EnrichResult {
  enrichment: Enrichment;
  cacheHit: boolean;
  attempts: number;
}

export async function enrichGraph(
  graph: ArchitectureGraph,
  opts: EnrichOptions
): Promise<EnrichResult | null> {
  if (!isConfigured(opts.llmConfig)) {
    console.warn(`[enricher] LLM provider (${opts.llmConfig.provider}) not configured for this user, skipping enrichment`);
    return null;
  }

  const graphHash = hashArchitectureGraph(graph);
  if (!opts.force && opts.priorEnrichment && opts.priorEnrichment.graphHash === graphHash) {
    return { enrichment: opts.priorEnrichment, cacheHit: true, attempts: 0 };
  }

  const readmeExcerpt = readReadme(opts.repoDir);
  const pkg = readPackageJson(opts.repoDir);
  const signalFiles = selectSignalFiles(graph, filePath => {
    if (!opts.repoDir) return null;
    const abs = path.join(opts.repoDir, filePath);
    try {
      return fs.readFileSync(abs, 'utf8');
    } catch {
      return null;
    }
  });

  const worldModel = buildWorldModelBlock({
    projectName: opts.projectName,
    repoUrl: opts.repoUrl,
    packageJson: pkg,
    readmeExcerpt,
    compressedTree: renderCompressedTree(graph),
    signalFiles,
    edgeCensus: renderEdgeCensus(graph),
    priorEnrichment: opts.priorEnrichment ? JSON.stringify(opts.priorEnrichment, null, 2) : undefined
  });

  // Pass 1: prose explanation.
  const narrative = await runPassOne(worldModel, opts.llmConfig);

  // Pass 2: structured annotation with retry loop.
  const candidates = buildCandidateLists(graph);
  const candidateText = renderCandidateLists(candidates);
  const validNodeIds = new Set(candidates.candidateNodes.map(n => n.id));
  const validEdgeIds = new Set(candidates.candidateEdges.map(e => e.id));

  const annotateModel = resolveAnnotateModel(opts.llmConfig);
  let attempts = 0;
  let lastFeedback = '';
  let lastPartial: Partial<Enrichment> | null = null;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    const partial = await runPassTwo(worldModel, narrative, candidateText, lastFeedback, opts.llmConfig);
    const errors = validateEnrichment(partial, validNodeIds, validEdgeIds);
    if (errors.length === 0) {
      const enrichment: Enrichment = {
        graphHash,
        systemNarrative: narrative,
        nodeAnnotations: partial.nodeAnnotations ?? {},
        edgeAnnotations: partial.edgeAnnotations ?? {},
        groups: partial.groups ?? [],
        flows: partial.flows ?? [],
        overviewNodeIds: partial.overviewNodeIds ?? [],
        generatedAt: new Date().toISOString(),
        model: annotateModel,
        enricherVersion: ENRICHER_VERSION
      };
      return { enrichment, cacheHit: false, attempts };
    }
    lastFeedback = errors.map(e => `- ${e}`).join('\n');
    lastPartial = partial;
    console.warn(`[enricher] attempt ${attempts} failed validation:\n${lastFeedback}`);
  }

  throw new Error(
    `Enrichment validation failed after ${MAX_ATTEMPTS} attempts. Last feedback:\n${lastFeedback}\nPartial: ${JSON.stringify(lastPartial).slice(0, 500)}`
  );
}

// ------------------------------------------------------------
// Pass 1 — prose narrative.
// ------------------------------------------------------------

async function runPassOne(worldModel: string, config: UserLLMConfig): Promise<string> {
  const result = await callLLM({
    config,
    model: resolveExplainModel(config),
    maxTokens: 2048,
    system: [
      { text: BASE_ARCHITECT_PROMPT },
      { text: worldModel, cacheable: true },
    ],
    userMessage: MODE_ANNOTATE,
  });
  if (!result.text) throw new Error('[enricher] Pass 1 returned no text');
  return result.text;
}

// ------------------------------------------------------------
// Pass 2 — structured tool call.
// ------------------------------------------------------------

async function runPassTwo(
  worldModel: string,
  narrative: string,
  candidates: string,
  validationFeedback: string,
  config: UserLLMConfig
): Promise<Partial<Enrichment>> {
  const userMsg = [
    MODE_ANNOTATE_STRUCTURED,
    '',
    '<narrative>',
    narrative,
    '</narrative>',
    '',
    candidates,
    validationFeedback
      ? `\n<validation_feedback>\nYour previous attempt failed. Fix these issues:\n${validationFeedback}\n</validation_feedback>`
      : '',
  ].join('\n');

  const result = await callLLM({
    config,
    model: resolveAnnotateModel(config),
    maxTokens: 4096,
    system: [
      { text: BASE_ARCHITECT_PROMPT },
      { text: worldModel, cacheable: true },
    ],
    userMessage: userMsg,
    tools: [{
      name: EMIT_ENRICHMENT_TOOL.name,
      description: EMIT_ENRICHMENT_TOOL.description,
      input_schema: EMIT_ENRICHMENT_TOOL.input_schema as Record<string, unknown>,
    }],
    forceTool: EMIT_ENRICHMENT_TOOL.name,
  });

  if (!result.toolUse) throw new Error('[enricher] Pass 2 did not emit tool_use');
  return result.toolUse.input as Partial<Enrichment>;
}

// ------------------------------------------------------------
// Validation — every returned id must exist, budgets must hold.
// ------------------------------------------------------------

function validateEnrichment(
  partial: Partial<Enrichment>,
  validNodeIds: Set<string>,
  validEdgeIds: Set<string>
): string[] {
  const errors: string[] = [];

  const overview = partial.overviewNodeIds ?? [];
  if (overview.length < 14 || overview.length > 24) {
    errors.push(`overviewNodeIds must contain 14-24 entries, got ${overview.length}`);
  }
  for (const id of overview) {
    if (!validNodeIds.has(id)) errors.push(`overviewNodeIds contains unknown id: ${id}`);
  }

  const nodeAnns = partial.nodeAnnotations ?? {};
  for (const id of Object.keys(nodeAnns)) {
    if (!validNodeIds.has(id)) errors.push(`nodeAnnotations key not in candidates: ${id}`);
  }

  const edgeAnns = partial.edgeAnnotations ?? {};
  for (const id of Object.keys(edgeAnns)) {
    if (!validEdgeIds.has(id)) errors.push(`edgeAnnotations key not in candidates: ${id}`);
  }

  const groups = partial.groups ?? [];
  if (groups.length > 8) errors.push(`groups must be 0-8, got ${groups.length}`);
  const seenInGroup = new Set<string>();
  for (const g of groups) {
    for (const m of g.memberNodeIds) {
      if (!validNodeIds.has(m)) errors.push(`group "${g.label}" references unknown node: ${m}`);
      if (seenInGroup.has(m)) errors.push(`node ${m} belongs to multiple groups`);
      seenInGroup.add(m);
    }
  }

  const flows = partial.flows ?? [];
  for (const f of flows) {
    for (const eid of f.edgeIds) {
      if (!validEdgeIds.has(eid)) errors.push(`flow "${f.label}" references unknown edge: ${eid}`);
    }
  }

  return errors;
}

// ------------------------------------------------------------
// File helpers — README + package.json from cloned repo.
// ------------------------------------------------------------

function readReadme(repoDir?: string): string | undefined {
  if (!repoDir) return undefined;
  for (const name of ['README.md', 'readme.md', 'Readme.md', 'README']) {
    const p = path.join(repoDir, name);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8').slice(0, 8192);
    }
  }
  return undefined;
}

function readPackageJson(repoDir?: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> } | undefined {
  if (!repoDir) return undefined;
  const p = path.join(repoDir, 'package.json');
  if (!fs.existsSync(p)) return undefined;
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      dependencies: raw.dependencies,
      devDependencies: raw.devDependencies,
      scripts: raw.scripts
    };
  } catch {
    return undefined;
  }
}

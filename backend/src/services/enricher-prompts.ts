import type { ArchitectureGraph, ArchitectureNode, FileInfo, FlowEdge } from '@vibeboard/shared';

// ------------------------------------------------------------
// Tool schema for MODE_ANNOTATE_STRUCTURED — forces the LLM
// to emit Enrichment as a tool_use block rather than prose.
// ------------------------------------------------------------

export const EMIT_ENRICHMENT_TOOL = {
  name: 'emit_enrichment',
  description: 'Emit the annotated architecture model. Every id referenced must exist in the candidate lists.',
  input_schema: {
    type: 'object',
    properties: {
      nodeAnnotations: {
        type: 'object',
        description: 'Map of nodeId -> annotation. Keys must exist in candidateNodes.',
        additionalProperties: {
          type: 'object',
          properties: {
            semanticRole: { type: 'string', description: '2-4 word role, e.g. "Auth middleware"' },
            description: { type: 'string', description: '1-2 sentence explanation' },
            layer: { type: 'string', description: 'Frontend | Backend | Shared | custom' },
            hideFromOverview: { type: 'boolean' }
          },
          required: ['semanticRole', 'description', 'hideFromOverview']
        }
      },
      edgeAnnotations: {
        type: 'object',
        description: 'Map of edgeId -> annotation. Label only cross-group edges.',
        additionalProperties: {
          type: 'object',
          properties: {
            verbLabel: { type: 'string', description: '1-4 words, payload-oriented verb phrase' },
            payload: { type: 'string' },
            crossesGroup: { type: 'boolean' }
          },
          required: ['verbLabel', 'crossesGroup']
        }
      },
      groups: {
        type: 'array',
        description: '0-8 single-level groups.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            memberNodeIds: { type: 'array', items: { type: 'string' } },
            tone: { type: 'string', enum: ['blue', 'amber', 'mint', 'rose', 'indigo', 'teal'] }
          },
          required: ['id', 'label', 'memberNodeIds']
        }
      },
      flows: {
        type: 'array',
        description: '1-3 named flows telling user stories.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            edgeIds: { type: 'array', items: { type: 'string' } }
          },
          required: ['id', 'label', 'edgeIds']
        }
      },
      overviewNodeIds: {
        type: 'array',
        description: '14-24 node ids for the Overview view.',
        items: { type: 'string' }
      }
    },
    required: ['nodeAnnotations', 'edgeAnnotations', 'groups', 'flows', 'overviewNodeIds']
  }
} as const;

// ------------------------------------------------------------
// Candidate set builders — produce the per-call lists that the
// validator will check LLM output against.
// ------------------------------------------------------------

export interface CandidateLists {
  candidateNodes: Array<{ id: string; kind: 'folder' | 'file'; type: string; loc?: number; hint?: string }>;
  candidateEdges: Array<{ id: string; source: string; target: string; importCount: number; dataFlowCount: number }>;
}

export function buildCandidateLists(graph: ArchitectureGraph): CandidateLists {
  const nodes: CandidateLists['candidateNodes'] = [];
  const walk = (n: ArchitectureNode) => {
    if (n.type !== 'root' && shouldSurface(n)) {
      nodes.push({ id: n.id, kind: 'folder', type: n.type, hint: n.displayName });
    }
    for (const f of n.files) {
      if (shouldSurfaceFile(f)) {
        nodes.push({ id: f.path, kind: 'file', type: f.type, loc: f.loc, hint: f.displayName });
      }
    }
    for (const c of n.children) walk(c);
  };
  walk(graph.root);

  const edges = graph.edges
    .filter(e => e.dataFlowCount > 0 || e.importCount > 1)
    .map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      importCount: e.importCount,
      dataFlowCount: e.dataFlowCount
    }));

  return { candidateNodes: nodes, candidateEdges: edges };
}

function shouldSurface(n: ArchitectureNode): boolean {
  if (n.metadata.totalFiles === 0) return false;
  if (n.children.length === 1 && n.files.length === 0) return false;
  return true;
}

function shouldSurfaceFile(f: FileInfo): boolean {
  if (/\.(test|spec)\./i.test(f.name)) return false;
  if (/\.config\./i.test(f.name)) return false;
  if (f.type === 'type-definition' && f.imports.length === 0) return false;
  const isBarrel = f.name === 'index.ts' || f.name === 'index.tsx';
  if (isBarrel && f.reExports.length > 0 && f.exports.length === 0) return false;
  const dataFlow = f.imports.filter(i => i.isDataFlow).length;
  if (f.imports.length < 2 && dataFlow === 0 && f.exports.length === 0) return false;
  return true;
}

// ------------------------------------------------------------
// Compact renderers used to build the world-model block.
// Keep these lean — every token matters at the 200K context.
// ------------------------------------------------------------

export function renderCompressedTree(graph: ArchitectureGraph): string {
  const lines: string[] = [];
  const walk = (n: ArchitectureNode, depth: number) => {
    const indent = '  '.repeat(depth);
    const meta = `type=${n.type} ctx=${n.executionContext} files=${n.metadata.totalFiles} loc=${n.metadata.totalLoc}`;
    lines.push(`${indent}- ${n.id} (${meta})`);
    for (const f of n.files) {
      lines.push(`${indent}  * ${f.name} type=${f.type} loc=${f.loc}`);
    }
    for (const c of n.children) walk(c, depth + 1);
  };
  walk(graph.root, 0);
  return lines.join('\n');
}

export function renderEdgeCensus(graph: ArchitectureGraph): string {
  const total = graph.edges.length;
  const dataFlow = graph.edges.filter(e => e.dataFlowCount > 0).length;
  const dynamic = graph.edges.filter(e => e.hasDynamic).length;
  const top = [...graph.edges]
    .sort((a, b) => b.importCount - a.importCount)
    .slice(0, 10)
    .map(e => `  ${e.source} -> ${e.target} (ic=${e.importCount}, df=${e.dataFlowCount})`);
  return [
    `totalEdges: ${total}`,
    `dataFlowEdges: ${dataFlow}`,
    `dynamicEdges: ${dynamic}`,
    `top10ByImportCount:`,
    ...top
  ].join('\n');
}

export function renderCandidateLists(c: CandidateLists): string {
  return [
    `<candidateNodes count=${c.candidateNodes.length}>`,
    ...c.candidateNodes.map(n => `  ${n.id} kind=${n.kind} type=${n.type}${n.hint ? ` hint="${n.hint}"` : ''}`),
    `</candidateNodes>`,
    `<candidateEdges count=${c.candidateEdges.length}>`,
    ...c.candidateEdges.map(e => `  ${e.id} ${e.source}->${e.target} ic=${e.importCount} df=${e.dataFlowCount}`),
    `</candidateEdges>`
  ].join('\n');
}

// Signal-file selection — verbatim slices of the most important files.
// Called with user-facing repo path so we can produce a path the LLM
// can match back to candidate node IDs.
export function selectSignalFiles(
  graph: ArchitectureGraph,
  readFile: (path: string) => string | null,
  maxFiles = 20,
  maxBytesTotal = 40_000
): string {
  const picks: FileInfo[] = [];
  const walk = (n: ArchitectureNode) => {
    for (const f of n.files) {
      const isEntry =
        f.type === 'api-route' ||
        f.type === 'middleware' ||
        f.type === 'page' ||
        f.type === 'layout' ||
        f.executionContext === 'api' ||
        f.executionContext === 'edge';
      const highDataFlow = f.imports.filter(i => i.isDataFlow).length >= 3;
      if (isEntry || highDataFlow) picks.push(f);
    }
    for (const c of n.children) walk(c);
  };
  walk(graph.root);

  picks.sort((a, b) => b.imports.length + b.exports.length - (a.imports.length + a.exports.length));
  const slice = picks.slice(0, maxFiles);

  let budget = maxBytesTotal;
  const out: string[] = [];
  for (const f of slice) {
    if (budget <= 0) break;
    const content = readFile(f.path);
    if (!content) continue;
    const head = content.split('\n').slice(0, 40).join('\n');
    const block = `--- ${f.path} ---\nexports: ${f.exports.join(', ') || '(none)'}\n${head}\n`;
    if (block.length > budget) continue;
    out.push(block);
    budget -= block.length;
  }
  return out.join('\n');
}

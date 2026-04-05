import type { NodeType, ExecutionContext } from '@vibeboard/shared';

export interface FileClassification {
  type: NodeType;
  executionContext: ExecutionContext;
}

export function classifyFile(filePath: string, directives: string[] = []): FileClassification {
  const normalized = filePath.replace(/\\/g, '/');
  const basename = normalized.split('/').pop() ?? '';
  const nameWithoutExt = basename.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');

  // NodeType classification by Next.js / common conventions
  let type: NodeType = inferTypeFromExtension(basename);

  if (/\/app\/.*\/page\.(tsx?|jsx?)$/.test(normalized) || /^app\/page\.(tsx?|jsx?)$/.test(normalized)) {
    type = 'page';
  } else if (/\/app\/.*\/layout\.(tsx?|jsx?)$/.test(normalized) || /^app\/layout\.(tsx?|jsx?)$/.test(normalized)) {
    type = 'layout';
  } else if (/\/app\/.*\/loading\.(tsx?|jsx?)$/.test(normalized) || /^app\/loading\.(tsx?|jsx?)$/.test(normalized)) {
    type = 'loading';
  } else if (/\/app\/.*\/error\.(tsx?|jsx?)$/.test(normalized) || /^app\/error\.(tsx?|jsx?)$/.test(normalized)) {
    type = 'error';
  } else if (/\/app\/api\/.*\/route\.(tsx?|jsx?)$/.test(normalized) || /^app\/api\/.*\/route\.(tsx?|jsx?)$/.test(normalized)) {
    type = 'api-route';
  } else if (/\/components\//.test(normalized) || /^components\//.test(normalized)) {
    type = 'component';
  } else if (/\/hooks\//.test(normalized) || /^hooks\//.test(normalized)) {
    type = 'hook';
  } else if (/\/lib\//.test(normalized) || /^lib\//.test(normalized) || /\/utils\//.test(normalized) || /^utils\//.test(normalized)) {
    type = 'library';
  } else if (/\/types\//.test(normalized) || /^types\//.test(normalized) || nameWithoutExt.endsWith('.d')) {
    type = 'type-definition';
  } else if (basename === 'middleware.ts' || basename === 'middleware.js') {
    type = 'middleware';
  } else if (/\.config\.(tsx?|jsx?|mjs|cjs)$/.test(basename)) {
    type = 'config';
  }

  // ExecutionContext classification — directives take priority
  let executionContext: ExecutionContext = 'server';

  if (directives.includes('use client')) {
    executionContext = 'client';
  } else if (directives.includes('use server')) {
    executionContext = 'server';
  } else if (type === 'api-route') {
    executionContext = 'api';
  } else if (type === 'middleware') {
    executionContext = 'edge';
  } else if (type === 'config') {
    executionContext = 'build';
  }

  return { type, executionContext };
}

function inferTypeFromExtension(basename: string): NodeType {
  if (/\.(tsx|jsx)$/.test(basename)) return 'component';
  return 'library';
}

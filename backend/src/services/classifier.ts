import type { NodeType, ExecutionContext } from '@vibeboard/shared';

export interface FileClassification {
  type: NodeType;
  executionContext: ExecutionContext;
}

export function classifyFile(_filePath: string, _directives: string[]): FileClassification {
  // TODO: Classify based on Next.js conventions:
  //
  // NodeType rules:
  // - app/**/page.tsx → 'page'
  // - app/**/layout.tsx → 'layout'
  // - app/**/loading.tsx → 'loading'
  // - app/**/error.tsx → 'error'
  // - app/api/**/route.ts → 'api-route'
  // - components/** → 'component'
  // - lib/** → 'library'
  // - hooks/** → 'hook'
  // - types/** → 'type-definition'
  // - middleware.ts → 'middleware'
  // - *.config.* → 'config'
  // - everything else → 'folder' or infer from content
  //
  // ExecutionContext rules:
  // - has 'use client' directive → 'client'
  // - files in app/api/ → 'api'
  // - middleware.ts → 'edge'
  // - *.config.* → 'build'
  // - everything else → 'server' (Next.js default)

  return { type: 'folder', executionContext: 'server' };
}

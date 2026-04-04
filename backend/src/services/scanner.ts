import type { ArchitectureGraph } from '@vibeboard/shared';

export async function scanRepository(
  _repoPath: string,
  _repoUrl: string,
  _branch: string
): Promise<ArchitectureGraph> {
  // TODO: Implementation pipeline:
  // 1. Create ts-morph Project, add source files from repoPath (all .ts, .tsx, .js, .jsx)
  // 2. For each source file:
  //    a. Get file path relative to repo root
  //    b. Extract all import declarations (module specifier + named imports)
  //    c. Resolve import paths to actual files
  //    d. Extract all export declarations
  //    e. Check for directives ('use client', 'use server')
  //    f. Count lines of code
  //    g. Classify file using classifier service
  // 3. Build the hierarchical ArchitectureNode tree from flat file list
  // 4. Compute FlowEdges between sibling nodes at each level
  // 5. Return complete ArchitectureGraph
  throw new Error('scanRepository not implemented');
}

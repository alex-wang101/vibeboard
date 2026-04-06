import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { Project as TsMorphProject, SyntaxKind } from 'ts-morph';
import type {
  ArchitectureGraph,
  ArchitectureNode,
  FileInfo,
  ImportInfo,
  ImportKind,
  ReExportInfo,
  FlowEdge,
  NodeMetadata,
  ExecutionContext,
  SkippedImport,
} from '@vibeboard/shared';
import { classifyFile } from './classifier';

// ============================================================
// Main entry point
// ============================================================

export async function scanRepository(
  repoPath: string,
  repoUrl: string,
  branch: string
): Promise<ArchitectureGraph> {
  const start = Date.now();

  // Phase A: ts-morph extraction
  const t0 = Date.now();
  const { fileEntries, skippedImports, flatImports } = extractWithTsMorph(repoPath);
  const t1 = Date.now();

  // Log import kind breakdown
  const kindCounts: Record<string, number> = {};
  for (const fi of flatImports) {
    kindCounts[fi.kind] = (kindCounts[fi.kind] || 0) + 1;
  }
  const kindSummary = Object.entries(kindCounts).map(([k, v]) => `${v} ${k}`).join(', ');
  log(`Extraction: ${fileEntries.length} files, ${flatImports.length} imports [${kindSummary}], ${skippedImports.length} skipped (${ms(t1 - t0)})`);

  // Phase B: build tree
  const t2 = Date.now();
  const root = buildTree(fileEntries);
  const t3 = Date.now();
  log(`Tree: ${countFolders(root)} folder nodes (${ms(t3 - t2)})`);

  // Phase C: edge aggregation
  const t4 = Date.now();
  const allEdges = aggregateEdges(root, flatImports);
  const t5 = Date.now();
  log(`Edges: ${allEdges.length} file-level edges (${ms(t5 - t4)})`);
  log(`Total scan: ${ms(Date.now() - start)}`);

  const now = new Date().toISOString();
  return {
    projectId: '',
    repoUrl,
    branch,
    scannedAt: now,
    lastModifiedAt: now,
    root,
    edges: allEdges,
    skippedImports,
  };
}

// ============================================================
// Phase A: ts-morph extraction
// ============================================================

interface FlatImport {
  fromFile: string;
  toFile: string;
  specifiers: string[];
  kind: ImportKind;
  isDataFlow: boolean;
}

function extractWithTsMorph(repoPath: string): {
  fileEntries: FileEntry[];
  skippedImports: SkippedImport[];
  flatImports: FlatImport[];
} {
  // Find all tsconfig.json files in the repo (monorepo support)
  const tsConfigs = globSync('**/tsconfig.json', {
    cwd: repoPath,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  });

  const project = new TsMorphProject({
    compilerOptions: { allowJs: true, jsx: 1 /* Preserve */ },
    skipAddingFilesFromTsConfig: true,
  });

  if (tsConfigs.length > 0) {
    log(`Found ${tsConfigs.length} tsconfig(s): ${tsConfigs.join(', ')}`);
    for (const tc of tsConfigs) {
      const tcAbsolute = path.join(repoPath, tc);
      try {
        const subProject = new TsMorphProject({
          tsConfigFilePath: tcAbsolute,
          skipAddingFilesFromTsConfig: false,
        });
        for (const sf of subProject.getSourceFiles()) {
          const rel = path.relative(repoPath, sf.getFilePath());
          if (!rel.startsWith('..') && !rel.includes('node_modules')) {
            if (!project.getSourceFile(sf.getFilePath())) {
              project.addSourceFileAtPath(sf.getFilePath());
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`Warning: failed to load ${tc}: ${msg}`);
      }
    }
  } else {
    log(`No tsconfig.json found, adding files manually`);
  }

  // Also add loose source files not covered by tsconfigs
  const allSourcePaths = globSync('**/*.{ts,tsx,js,jsx}', {
    cwd: repoPath,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/.git/**'],
    absolute: true,
  });
  for (const absPath of allSourcePaths) {
    if (!project.getSourceFile(absPath)) {
      try { project.addSourceFileAtPath(absPath); } catch { /* skip */ }
    }
  }

  const sourceFiles = project.getSourceFiles();
  log(`ts-morph loaded ${sourceFiles.length} source files total`);

  const fileEntries: FileEntry[] = [];
  const skippedImports: SkippedImport[] = [];
  const flatImports: FlatImport[] = [];
  let filteredCount = 0;

  for (const sourceFile of sourceFiles) {
    const absolutePath = sourceFile.getFilePath();
    const relativePath = path.relative(repoPath, absolutePath).replace(/\\/g, '/');

    if (
      relativePath.includes('node_modules') ||
      relativePath.includes('.next') ||
      relativePath.includes('dist/') ||
      relativePath.includes('build/') ||
      relativePath.includes('.git/') ||
      relativePath.startsWith('.')
    ) continue;

    filteredCount++;
    if (filteredCount > 5000) {
      throw new Error(`Repository has more than 5000 source files (limit: 5000).`);
    }

    try {
      const extracted = extractFileData(sourceFile, repoPath, relativePath);

      // Build flat imports for edge aggregation
      for (const imp of extracted.imports) {
        flatImports.push({
          fromFile: relativePath,
          toFile: imp.resolvedPath,
          specifiers: imp.specifiers,
          kind: imp.kind,
          isDataFlow: imp.isDataFlow,
        });
      }

      // Track skipped imports (unresolved path-like imports)
      for (const importDecl of sourceFile.getImportDeclarations()) {
        const moduleSpec = importDecl.getModuleSpecifierValue();
        const resolved = importDecl.getModuleSpecifierSourceFile();
        if (!resolved && (moduleSpec.startsWith('.') || moduleSpec.startsWith('@/') || moduleSpec.startsWith('~/'))) {
          skippedImports.push({ sourceFile: relativePath, importPath: moduleSpec });
        }
      }

      const { type, executionContext } = classifyFile(relativePath, extracted.directives);
      const name = path.basename(relativePath);
      const displayName = deriveFileDisplayName(relativePath, extracted.exports, type);

      fileEntries.push({
        relativePath,
        info: {
          path: relativePath,
          name,
          displayName,
          type,
          executionContext,
          loc: extracted.loc,
          exports: extracted.exports,
          imports: extracted.imports,
          reExports: extracted.reExports,
          isManual: false,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Warning: skipping ${relativePath}: ${msg}`);
    }
  }

  log(`${filteredCount} files after filtering`);
  return { fileEntries, skippedImports, flatImports };
}

function extractFileData(
  sourceFile: ReturnType<TsMorphProject['getSourceFiles']>[number],
  repoPath: string,
  _relativePath: string
): {
  imports: ImportInfo[];
  exports: string[];
  reExports: ReExportInfo[];
  directives: string[];
  loc: number;
} {
  const imports: ImportInfo[] = [];
  const reExports: ReExportInfo[] = [];

  // ---- 1. ES6 import declarations ----
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();

    if (!resolvedSourceFile) continue;

    const resolvedRelative = path.relative(repoPath, resolvedSourceFile.getFilePath()).replace(/\\/g, '/');
    if (resolvedRelative.includes('node_modules') || resolvedRelative.startsWith('..')) continue;

    const specifiers = importDecl.getNamedImports().map((n) => n.getName());
    const defaultImport = importDecl.getDefaultImport()?.getText();
    if (defaultImport) specifiers.unshift(defaultImport);

    // Classify the import
    let kind: ImportKind;
    let isDataFlow: boolean;

    if (importDecl.isTypeOnly()) {
      kind = 'type-only';
      isDataFlow = false;
    } else if (specifiers.length === 0 && !defaultImport) {
      kind = 'side-effect';
      isDataFlow = false;
    } else {
      kind = 'static';
      isDataFlow = true;
    }

    imports.push({
      source: moduleSpecifier,
      resolvedPath: resolvedRelative,
      specifiers,
      kind,
      isDataFlow,
    });
  }

  // ---- 2. Dynamic imports: import('./path') ----
  try {
    for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const exprText = callExpr.getExpression().getText();
      if (exprText !== 'import') continue;

      const args = callExpr.getArguments();
      if (args.length === 0) continue;

      const argText = args[0].getText().replace(/['"]/g, '');
      // Try to resolve relative to the source file's directory
      if (!argText.startsWith('.') && !argText.startsWith('@/') && !argText.startsWith('~/')) continue;

      // Attempt resolution by checking if a matching file exists in the project
      const sourceDir = path.dirname(sourceFile.getFilePath());
      const candidates = [argText, argText + '.ts', argText + '.tsx', argText + '/index.ts', argText + '/index.tsx'];
      let resolved: string | null = null;

      for (const candidate of candidates) {
        const fullPath = path.resolve(sourceDir, candidate);
        if (sourceFile.getProject().getSourceFile(fullPath)) {
          resolved = path.relative(repoPath, fullPath).replace(/\\/g, '/');
          break;
        }
      }

      if (resolved && !resolved.includes('node_modules') && !resolved.startsWith('..')) {
        imports.push({
          source: argText,
          resolvedPath: resolved,
          specifiers: ['*dynamic*'],
          kind: 'dynamic',
          isDataFlow: true,
        });
      }
    }
  } catch {
    // AST traversal can fail on malformed files — skip silently
  }

  // ---- 3. CommonJS require() ----
  try {
    for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const exprText = callExpr.getExpression().getText();
      if (exprText !== 'require') continue;

      const args = callExpr.getArguments();
      if (args.length === 0) continue;

      const argText = args[0].getText().replace(/['"]/g, '');
      if (!argText.startsWith('.') && !argText.startsWith('@/') && !argText.startsWith('~/')) continue;

      const sourceDir = path.dirname(sourceFile.getFilePath());
      const candidates = [argText, argText + '.ts', argText + '.js', argText + '/index.ts', argText + '/index.js'];
      let resolved: string | null = null;

      for (const candidate of candidates) {
        const fullPath = path.resolve(sourceDir, candidate);
        if (sourceFile.getProject().getSourceFile(fullPath)) {
          resolved = path.relative(repoPath, fullPath).replace(/\\/g, '/');
          break;
        }
      }

      if (resolved && !resolved.includes('node_modules') && !resolved.startsWith('..')) {
        imports.push({
          source: argText,
          resolvedPath: resolved,
          specifiers: ['*require*'],
          kind: 'commonjs',
          isDataFlow: true,
        });
      }
    }
  } catch {
    // skip
  }

  // ---- 4. Re-exports: export { x } from './module' / export * from './module' ----
  for (const exportDecl of sourceFile.getExportDeclarations()) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;

    const resolvedSourceFile = exportDecl.getModuleSpecifierSourceFile();
    if (!resolvedSourceFile) continue;

    const resolvedRelative = path.relative(repoPath, resolvedSourceFile.getFilePath()).replace(/\\/g, '/');
    if (resolvedRelative.includes('node_modules') || resolvedRelative.startsWith('..')) continue;

    const namedExports = exportDecl.getNamedExports();
    const specifiers = namedExports.length > 0
      ? namedExports.map((n) => n.getName())
      : ['*'];

    reExports.push({
      source: moduleSpecifier,
      resolvedPath: resolvedRelative,
      specifiers,
    });

    // Also track as an import for edge aggregation
    imports.push({
      source: moduleSpecifier,
      resolvedPath: resolvedRelative,
      specifiers,
      kind: 're-export',
      isDataFlow: true,
    });
  }

  // ---- 5. Exports ----
  const exports: string[] = [];
  for (const [name] of sourceFile.getExportedDeclarations()) {
    if (name !== 'default') exports.push(name);
  }
  if (sourceFile.getDefaultExportSymbol()) exports.push('default');

  // ---- 6. Directives ----
  const fullText = sourceFile.getFullText();
  const firstLines = fullText.split('\n').slice(0, 5).join('\n');
  const directives: string[] = [];
  if (firstLines.includes("'use client'") || firstLines.includes('"use client"')) directives.push('use client');
  if (firstLines.includes("'use server'") || firstLines.includes('"use server"')) directives.push('use server');

  // ---- 7. LOC ----
  const loc = sourceFile.getEndLineNumber();

  return { imports, exports, reExports, directives, loc };
}

// ============================================================
// Display name derivation
// ============================================================

function deriveFileDisplayName(filePath: string, exports: string[], type: string): string {
  const basename = path.basename(filePath);
  const nameNoExt = basename.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');
  const parentDir = path.basename(path.dirname(filePath));

  switch (type) {
    case 'page': return titleCase(parentDir === 'app' ? 'Home' : parentDir) + ' Page';
    case 'layout': return titleCase(parentDir === 'app' ? 'Root' : parentDir) + ' Layout';
    case 'loading': return titleCase(parentDir) + ' Loading';
    case 'error': return titleCase(parentDir) + ' Error';
    case 'api-route': return titleCase(parentDir) + ' API';
    case 'hook': return exports.find((e) => e !== 'default' && e.startsWith('use')) ?? nameNoExt;
    case 'component': return exports.find((e) => e !== 'default' && /^[A-Z]/.test(e)) ?? titleCase(nameNoExt);
    default: return nameNoExt;
  }
}

function deriveFolderDisplayName(name: string): string {
  if (name.startsWith('[') || name.startsWith('(')) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function titleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\(([^)]+)\)/g, '$1')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ============================================================
// Phase B: tree builder
// ============================================================

interface FileEntry {
  relativePath: string;
  info: FileInfo;
}

function buildTree(fileEntries: FileEntry[]): ArchitectureNode {
  const dirMap = new Map<string, FileInfo[]>();

  for (const { relativePath, info } of fileEntries) {
    const dir = path.dirname(relativePath);
    const key = dir === '.' ? '' : dir;
    if (!dirMap.has(key)) dirMap.set(key, []);
    dirMap.get(key)!.push(info);

    const parts = key.split('/');
    for (let i = 1; i < parts.length; i++) {
      const ancestor = parts.slice(0, i).join('/');
      if (!dirMap.has(ancestor)) dirMap.set(ancestor, []);
    }
  }

  const root = buildNode('', 'root', dirMap);
  root.type = 'root';
  root.displayName = 'Root';
  return root;
}

function buildNode(dirPath: string, name: string, dirMap: Map<string, FileInfo[]>): ArchitectureNode {
  const files = dirMap.get(dirPath) ?? [];

  const childDirs = new Set<string>();
  for (const key of dirMap.keys()) {
    if (key === dirPath) continue;
    const relative = dirPath ? key.slice(dirPath.length + 1) : key;
    if (!relative || relative.includes('/')) continue;
    if (dirPath && !key.startsWith(dirPath + '/')) continue;
    childDirs.add(key);
  }

  const children: ArchitectureNode[] = [];
  for (const childDir of childDirs) {
    const childName = dirPath ? childDir.slice(dirPath.length + 1) : childDir;
    children.push(buildNode(childDir, childName, dirMap));
  }
  children.sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: dirPath || 'root',
    name,
    displayName: deriveFolderDisplayName(name),
    type: 'folder',
    executionContext: computeExecutionContext(files, children),
    children,
    files,
    metadata: computeMetadata(files, children),
    isManual: false,
  };
}

function computeMetadata(files: FileInfo[], children: ArchitectureNode[]): NodeMetadata {
  let totalFiles = files.length;
  let totalLoc = files.reduce((sum, f) => sum + f.loc, 0);
  let clientFileCount = files.filter((f) => f.executionContext === 'client').length;
  let serverFileCount = files.filter((f) => f.executionContext === 'server' || f.executionContext === 'api').length;

  for (const child of children) {
    totalFiles += child.metadata.totalFiles;
    totalLoc += child.metadata.totalLoc;
    clientFileCount += child.metadata.clientFileCount;
    serverFileCount += child.metadata.serverFileCount;
  }

  return { totalFiles, totalLoc, clientFileCount, serverFileCount };
}

function computeExecutionContext(files: FileInfo[], children: ArchitectureNode[]): ExecutionContext {
  const contexts = new Set<ExecutionContext>();
  for (const f of files) contexts.add(f.executionContext);
  for (const c of children) {
    if (c.executionContext === 'mixed') { contexts.add('client'); contexts.add('server'); }
    else contexts.add(c.executionContext);
  }

  if (contexts.size === 0) return 'unspecified';
  if (contexts.size === 1) return [...contexts][0];

  const hasClient = contexts.has('client');
  const hasServer = contexts.has('server') || contexts.has('api') || contexts.has('edge');
  if (hasClient && hasServer) return 'mixed';
  return [...contexts][0];
}

// ============================================================
// Phase C: edge aggregator
// ============================================================

interface EdgeAccum {
  count: number;
  dataFlowCount: number;
  typeOnlyCount: number;
  hasDynamic: boolean;
  samples: { from: string; to: string }[];
}

function aggregateEdges(root: ArchitectureNode, flatImports: FlatImport[]): FlowEdge[] {
  const fileToAncestors = new Map<string, string[]>();
  collectFilePaths(root, [], fileToAncestors);
  computeFolderEdges(root, flatImports);

  // Build flat deduplicated edge list
  const edgeMap = new Map<string, EdgeAccum>();
  for (const imp of flatImports) {
    const key = `${imp.fromFile}|${imp.toFile}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.count++;
      if (imp.isDataFlow) existing.dataFlowCount++;
      if (imp.kind === 'type-only') existing.typeOnlyCount++;
      if (imp.kind === 'dynamic') existing.hasDynamic = true;
      if (existing.samples.length < 3) existing.samples.push({ from: imp.fromFile, to: imp.toFile });
    } else {
      edgeMap.set(key, {
        count: 1,
        dataFlowCount: imp.isDataFlow ? 1 : 0,
        typeOnlyCount: imp.kind === 'type-only' ? 1 : 0,
        hasDynamic: imp.kind === 'dynamic',
        samples: [{ from: imp.fromFile, to: imp.toFile }],
      });
    }
  }

  return Array.from(edgeMap.entries()).map(([key, acc], i) => {
    const [source, target] = key.split('|');
    return {
      id: `edge-${i}`,
      source,
      target,
      importCount: acc.count,
      dataFlowCount: acc.dataFlowCount,
      typeOnlyCount: acc.typeOnlyCount,
      hasDynamic: acc.hasDynamic,
      samples: acc.samples,
      isManual: false,
    };
  });
}

function collectFilePaths(node: ArchitectureNode, ancestors: string[], result: Map<string, string[]>): void {
  const current = [...ancestors, node.id];
  for (const file of node.files) result.set(file.path, current);
  for (const child of node.children) collectFilePaths(child, current, result);
}

function computeFolderEdges(node: ArchitectureNode, flatImports: FlatImport[]): void {
  if (node.children.length === 0 && node.files.length === 0) return;

  const descendantFiles = new Set<string>();
  collectDescendantFiles(node, descendantFiles);

  const fileToDirectChild = new Map<string, string>();
  for (const child of node.children) {
    const childDesc = new Set<string>();
    collectDescendantFiles(child, childDesc);
    for (const fp of childDesc) fileToDirectChild.set(fp, child.id);
  }
  for (const file of node.files) fileToDirectChild.set(file.path, file.path);

  const internalMap = new Map<string, EdgeAccum>();
  const outboundMap = new Map<string, EdgeAccum>();

  for (const imp of flatImports) {
    if (!descendantFiles.has(imp.fromFile)) continue;
    const sourceChild = fileToDirectChild.get(imp.fromFile);
    if (!sourceChild) continue;

    if (descendantFiles.has(imp.toFile)) {
      const targetChild = fileToDirectChild.get(imp.toFile);
      if (!targetChild || targetChild === sourceChild) continue;
      accumEdge(internalMap, `${sourceChild}|${targetChild}`, imp);
    } else {
      const targetRootDir = imp.toFile.split('/')[0];
      accumEdge(outboundMap, `${sourceChild}|${targetRootDir}`, imp);
    }
  }

  node.folderEdges = {
    internal: mapToFlowEdges(internalMap, `${node.id}-int`),
    outbound: mapToFlowEdges(outboundMap, `${node.id}-out`),
  };

  for (const child of node.children) computeFolderEdges(child, flatImports);
}

function accumEdge(map: Map<string, EdgeAccum>, key: string, imp: FlatImport): void {
  const existing = map.get(key);
  if (existing) {
    existing.count++;
    if (imp.isDataFlow) existing.dataFlowCount++;
    if (imp.kind === 'type-only') existing.typeOnlyCount++;
    if (imp.kind === 'dynamic') existing.hasDynamic = true;
    if (existing.samples.length < 3) existing.samples.push({ from: imp.fromFile, to: imp.toFile });
  } else {
    map.set(key, {
      count: 1,
      dataFlowCount: imp.isDataFlow ? 1 : 0,
      typeOnlyCount: imp.kind === 'type-only' ? 1 : 0,
      hasDynamic: imp.kind === 'dynamic',
      samples: [{ from: imp.fromFile, to: imp.toFile }],
    });
  }
}

function mapToFlowEdges(map: Map<string, EdgeAccum>, prefix: string): FlowEdge[] {
  let i = 0;
  const edges: FlowEdge[] = [];
  for (const [key, acc] of map) {
    const [source, target] = key.split('|');
    edges.push({
      id: `${prefix}-${i++}`,
      source,
      target,
      importCount: acc.count,
      dataFlowCount: acc.dataFlowCount,
      typeOnlyCount: acc.typeOnlyCount,
      hasDynamic: acc.hasDynamic,
      samples: acc.samples,
      isManual: false,
    });
  }
  return edges;
}

function collectDescendantFiles(node: ArchitectureNode, result: Set<string>): void {
  for (const file of node.files) result.add(file.path);
  for (const child of node.children) collectDescendantFiles(child, result);
}

// ============================================================
// Utilities
// ============================================================

function countFolders(node: ArchitectureNode): number {
  let count = 1;
  for (const child of node.children) count += countFolders(child);
  return count;
}

function log(msg: string): void {
  console.log(`[VibeBoard Scanner] ${msg}`);
}

function ms(n: number): string {
  return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(1)}s`;
}

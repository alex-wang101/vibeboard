import fs from 'fs';
import path from 'path';
import { Project as TsMorphProject } from 'ts-morph';
import type {
  ArchitectureGraph,
  ArchitectureNode,
  FileInfo,
  ImportInfo,
  FlowEdge,
  FolderEdges,
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
  const timers: Record<string, number> = {};
  const start = Date.now();

  // Phase A: ts-morph extraction
  timers.extractStart = Date.now();
  const { fileEntries, skippedImports, flatImports } = extractWithTsMorph(repoPath);
  timers.extractEnd = Date.now();

  log(`Extraction: ${fileEntries.length} files, ${flatImports.length} internal imports, ${skippedImports.length} skipped imports (${ms(timers.extractEnd - timers.extractStart)})`);

  // Phase B: build tree
  timers.treeStart = Date.now();
  const root = buildTree(fileEntries);
  timers.treeEnd = Date.now();

  const folderCount = countFolders(root);
  log(`Tree: ${folderCount} folder nodes (${ms(timers.treeEnd - timers.treeStart)})`);

  // Phase C: edge aggregation
  timers.edgeStart = Date.now();
  const allEdges = aggregateEdges(root, flatImports);
  timers.edgeEnd = Date.now();

  log(`Edges: ${allEdges.length} file-level edges (${ms(timers.edgeEnd - timers.edgeStart)})`);
  log(`Total scan: ${ms(Date.now() - start)}`);

  const now = new Date().toISOString();
  return {
    projectId: '', // caller sets this
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

interface RawFileData {
  relativePath: string;
  imports: ImportInfo[];
  exports: string[];
  directives: string[];
  loc: number;
}

interface FlatImport {
  fromFile: string;
  toFile: string;
  specifiers: string[];
}

function extractWithTsMorph(repoPath: string): {
  fileEntries: FileEntry[];
  skippedImports: SkippedImport[];
  flatImports: FlatImport[];
} {
  const tsConfigPath = path.join(repoPath, 'tsconfig.json');
  const hasTsConfig = fs.existsSync(tsConfigPath);

  let project: TsMorphProject;
  if (hasTsConfig) {
    log(`Using tsconfig.json for import resolution`);
    project = new TsMorphProject({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  } else {
    log(`No tsconfig.json found, adding files manually`);
    project = new TsMorphProject({ compilerOptions: { allowJs: true } });
    project.addSourceFilesAtPaths(path.join(repoPath, '**/*.{ts,tsx,js,jsx}'));
  }

  const sourceFiles = project.getSourceFiles();
  log(`ts-morph found ${sourceFiles.length} source files`);

  // Filter and extract
  const fileEntries: FileEntry[] = [];
  const skippedImports: SkippedImport[] = [];
  const flatImports: FlatImport[] = [];
  let filteredCount = 0;

  for (const sourceFile of sourceFiles) {
    const absolutePath = sourceFile.getFilePath();
    const relativePath = path.relative(repoPath, absolutePath).replace(/\\/g, '/');

    // Skip non-source directories
    if (
      relativePath.includes('node_modules') ||
      relativePath.includes('.next') ||
      relativePath.includes('dist/') ||
      relativePath.includes('build/') ||
      relativePath.includes('.git/') ||
      relativePath.startsWith('.')
    ) {
      continue;
    }

    filteredCount++;

    // Safety check
    if (filteredCount > 5000) {
      throw new Error(
        `Repository has more than 5000 source files (limit: 5000). Consider scanning a subdirectory.`
      );
    }

    try {
      const raw = extractFileData(sourceFile, repoPath, relativePath);

      // Build flat imports for edge aggregation
      for (const imp of raw.imports) {
        flatImports.push({
          fromFile: raw.relativePath,
          toFile: imp.resolvedPath,
          specifiers: imp.specifiers,
        });
      }

      // Track skipped imports
      for (const importDecl of sourceFile.getImportDeclarations()) {
        const moduleSpec = importDecl.getModuleSpecifierValue();
        const resolved = importDecl.getModuleSpecifierSourceFile();
        if (!resolved) {
          // Only track non-package imports (ones that look like paths or aliases)
          if (moduleSpec.startsWith('.') || moduleSpec.startsWith('@/') || moduleSpec.startsWith('~/')) {
            skippedImports.push({
              sourceFile: relativePath,
              importPath: moduleSpec,
            });
          }
        }
      }

      // Classify and build FileInfo
      const { type, executionContext } = classifyFile(relativePath, raw.directives);
      const name = path.basename(relativePath);
      const displayName = deriveFileDisplayName(relativePath, raw.exports, type);

      fileEntries.push({
        relativePath,
        info: {
          path: relativePath,
          name,
          displayName,
          type,
          executionContext,
          loc: raw.loc,
          exports: raw.exports,
          imports: raw.imports,
          isManual: false,
        },
      });
    } catch (err) {
      // If a file can't be parsed, skip it
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
  relativePath: string
): RawFileData {
  // 1. Imports — only internal (resolved to project files)
  const imports: ImportInfo[] = [];
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();

    if (resolvedSourceFile) {
      const resolvedRelative = path.relative(repoPath, resolvedSourceFile.getFilePath()).replace(/\\/g, '/');

      // Skip if resolved to node_modules or outside the repo
      if (resolvedRelative.includes('node_modules') || resolvedRelative.startsWith('..')) {
        continue;
      }

      const specifiers = importDecl.getNamedImports().map((n) => n.getName());
      const defaultImport = importDecl.getDefaultImport()?.getText();
      if (defaultImport) {
        specifiers.unshift(defaultImport);
      }

      imports.push({
        source: moduleSpecifier,
        resolvedPath: resolvedRelative,
        specifiers,
      });
    }
  }

  // 2. Exports
  const exports: string[] = [];
  for (const [name] of sourceFile.getExportedDeclarations()) {
    if (name !== 'default') {
      exports.push(name);
    }
  }
  if (sourceFile.getDefaultExportSymbol()) {
    exports.push('default');
  }

  // 3. Directives
  const fullText = sourceFile.getFullText();
  const firstLines = fullText.split('\n').slice(0, 5).join('\n');
  const directives: string[] = [];
  if (firstLines.includes("'use client'") || firstLines.includes('"use client"')) {
    directives.push('use client');
  }
  if (firstLines.includes("'use server'") || firstLines.includes('"use server"')) {
    directives.push('use server');
  }

  // 4. LOC
  const loc = sourceFile.getEndLineNumber();

  return { relativePath, imports, exports, directives, loc };
}

// ============================================================
// Display name derivation
// ============================================================

function deriveFileDisplayName(
  filePath: string,
  exports: string[],
  type: string
): string {
  const basename = path.basename(filePath);
  const nameNoExt = basename.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');
  const parentDir = path.basename(path.dirname(filePath));

  switch (type) {
    case 'page':
      return titleCase(parentDir === 'app' ? 'Home' : parentDir) + ' Page';
    case 'layout':
      return titleCase(parentDir === 'app' ? 'Root' : parentDir) + ' Layout';
    case 'loading':
      return titleCase(parentDir) + ' Loading';
    case 'error':
      return titleCase(parentDir) + ' Error';
    case 'api-route':
      return titleCase(parentDir) + ' API';
    case 'hook': {
      const primary = exports.find((e) => e !== 'default' && e.startsWith('use'));
      return primary ?? nameNoExt;
    }
    case 'component': {
      const primary = exports.find((e) => e !== 'default' && /^[A-Z]/.test(e));
      return primary ?? titleCase(nameNoExt);
    }
    default:
      return nameNoExt;
  }
}

function deriveFolderDisplayName(name: string): string {
  // Handle Next.js special folders
  if (name.startsWith('[') || name.startsWith('(')) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function titleCase(str: string): string {
  // Handle kebab-case, snake_case, and bracket patterns
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\(([^)]+)\)/g, '$1')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ============================================================
// Phase B: tree builder (augmented from original)
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
  }

  const root = buildNode('', 'root', dirMap);
  root.type = 'root';
  root.displayName = 'Root';
  return root;
}

function buildNode(
  dirPath: string,
  name: string,
  dirMap: Map<string, FileInfo[]>
): ArchitectureNode {
  const files = dirMap.get(dirPath) ?? [];

  // Find immediate child directories
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

  const metadata = computeMetadata(files, children);
  const executionContext = computeExecutionContext(files, children);

  return {
    id: dirPath || 'root',
    name,
    displayName: deriveFolderDisplayName(name),
    type: 'folder',
    executionContext,
    children,
    files,
    metadata,
    isManual: false,
  };
}

function computeMetadata(files: FileInfo[], children: ArchitectureNode[]): NodeMetadata {
  let totalFiles = files.length;
  let totalLoc = files.reduce((sum, f) => sum + f.loc, 0);
  let clientFileCount = files.filter((f) => f.executionContext === 'client').length;
  let serverFileCount = files.filter(
    (f) => f.executionContext === 'server' || f.executionContext === 'api'
  ).length;

  for (const child of children) {
    totalFiles += child.metadata.totalFiles;
    totalLoc += child.metadata.totalLoc;
    clientFileCount += child.metadata.clientFileCount;
    serverFileCount += child.metadata.serverFileCount;
  }

  return { totalFiles, totalLoc, clientFileCount, serverFileCount };
}

function computeExecutionContext(
  files: FileInfo[],
  children: ArchitectureNode[]
): ExecutionContext {
  const contexts = new Set<ExecutionContext>();
  for (const f of files) contexts.add(f.executionContext);
  for (const c of children) {
    if (c.executionContext === 'mixed') {
      contexts.add('client');
      contexts.add('server');
    } else {
      contexts.add(c.executionContext);
    }
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

function aggregateEdges(root: ArchitectureNode, flatImports: FlatImport[]): FlowEdge[] {
  // Build a map: filePath → which folder path it belongs to at each level
  const fileToAncestors = new Map<string, string[]>();
  collectFilePaths(root, [], fileToAncestors);

  // Walk tree and compute per-folder edges
  computeFolderEdges(root, flatImports, fileToAncestors);

  // Build flat edge list (deduplicated file-to-file edges)
  const edgeMap = new Map<string, FlowEdge>();
  for (const imp of flatImports) {
    const key = `${imp.fromFile}|${imp.toFile}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.importCount++;
      if (existing.samples.length < 3) {
        existing.samples.push({ from: imp.fromFile, to: imp.toFile });
      }
    } else {
      edgeMap.set(key, {
        id: `edge-${edgeMap.size}`,
        source: imp.fromFile,
        target: imp.toFile,
        importCount: 1,
        samples: [{ from: imp.fromFile, to: imp.toFile }],
        isManual: false,
      });
    }
  }

  return Array.from(edgeMap.values());
}

function collectFilePaths(
  node: ArchitectureNode,
  ancestors: string[],
  result: Map<string, string[]>
): void {
  const currentPath = node.id;
  const currentAncestors = [...ancestors, currentPath];

  for (const file of node.files) {
    result.set(file.path, currentAncestors);
  }

  for (const child of node.children) {
    collectFilePaths(child, currentAncestors, result);
  }
}

function computeFolderEdges(
  node: ArchitectureNode,
  flatImports: FlatImport[],
  fileToAncestors: Map<string, string[]>
): void {
  // Only compute for folders with children
  if (node.children.length === 0 && node.files.length === 0) {
    return;
  }

  // Get all descendant file paths for this folder
  const descendantFiles = new Set<string>();
  collectDescendantFiles(node, descendantFiles);

  // Map: file path → which direct child of this node contains it
  const fileToDirectChild = new Map<string, string>();
  for (const child of node.children) {
    const childDescendants = new Set<string>();
    collectDescendantFiles(child, childDescendants);
    for (const fp of childDescendants) {
      fileToDirectChild.set(fp, child.id);
    }
  }
  // Files directly in this folder map to themselves
  for (const file of node.files) {
    fileToDirectChild.set(file.path, file.path);
  }

  // Aggregate edges
  const internalMap = new Map<string, { count: number; samples: { from: string; to: string }[] }>();
  const outboundMap = new Map<string, { count: number; samples: { from: string; to: string }[] }>();

  for (const imp of flatImports) {
    // Is source a descendant of this folder?
    if (!descendantFiles.has(imp.fromFile)) continue;

    const sourceChild = fileToDirectChild.get(imp.fromFile);
    if (!sourceChild) continue;

    if (descendantFiles.has(imp.toFile)) {
      // Target is also a descendant — check if different direct child
      const targetChild = fileToDirectChild.get(imp.toFile);
      if (!targetChild || targetChild === sourceChild) continue;

      // Internal edge
      const key = `${sourceChild}|${targetChild}`;
      const existing = internalMap.get(key);
      if (existing) {
        existing.count++;
        if (existing.samples.length < 3) {
          existing.samples.push({ from: imp.fromFile, to: imp.toFile });
        }
      } else {
        internalMap.set(key, {
          count: 1,
          samples: [{ from: imp.fromFile, to: imp.toFile }],
        });
      }
    } else {
      // Outbound — target is outside this folder
      // Identify by root-level directory of the target
      const targetRootDir = imp.toFile.split('/')[0];
      const key = `${sourceChild}|${targetRootDir}`;
      const existing = outboundMap.get(key);
      if (existing) {
        existing.count++;
        if (existing.samples.length < 3) {
          existing.samples.push({ from: imp.fromFile, to: imp.toFile });
        }
      } else {
        outboundMap.set(key, {
          count: 1,
          samples: [{ from: imp.fromFile, to: imp.toFile }],
        });
      }
    }
  }

  // Convert to FlowEdge arrays
  let edgeId = 0;
  const internal: FlowEdge[] = [];
  for (const [key, data] of internalMap) {
    const [source, target] = key.split('|');
    internal.push({
      id: `${node.id}-internal-${edgeId++}`,
      source,
      target,
      importCount: data.count,
      samples: data.samples,
      isManual: false,
    });
  }

  const outbound: FlowEdge[] = [];
  for (const [key, data] of outboundMap) {
    const [source, target] = key.split('|');
    outbound.push({
      id: `${node.id}-outbound-${edgeId++}`,
      source,
      target,
      importCount: data.count,
      samples: data.samples,
      isManual: false,
    });
  }

  node.folderEdges = { internal, outbound };

  // Recurse into children
  for (const child of node.children) {
    computeFolderEdges(child, flatImports, fileToAncestors);
  }
}

function collectDescendantFiles(node: ArchitectureNode, result: Set<string>): void {
  for (const file of node.files) {
    result.add(file.path);
  }
  for (const child of node.children) {
    collectDescendantFiles(child, result);
  }
}

// ============================================================
// Utilities
// ============================================================

function countFolders(node: ArchitectureNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countFolders(child);
  }
  return count;
}

function log(msg: string): void {
  console.log(`[VibeBoard Scanner] ${msg}`);
}

function ms(n: number): string {
  return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(1)}s`;
}

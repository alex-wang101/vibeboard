import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import type {
  ArchitectureGraph,
  ArchitectureNode,
  FileInfo,
  NodeMetadata,
  ExecutionContext,
} from '@vibeboard/shared';
import { classifyFile } from './classifier';

export async function scanRepository(
  repoPath: string,
  repoUrl: string,
  branch: string
): Promise<ArchitectureGraph> {
  // Find all source files, excluding common non-source dirs
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: repoPath,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/.git/**'],
  });

  // Safety check for very large repos
  if (files.length > 5000) {
    throw new Error(
      `Repository has ${files.length} source files (limit: 5000). Consider scanning a subdirectory.`
    );
  }

  // Build FileInfo for each file
  const fileInfos: { relativePath: string; info: FileInfo }[] = [];

  for (const relativePath of files) {
    const absolutePath = path.join(repoPath, relativePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    const loc = content.split('\n').length;
    const { type, executionContext } = classifyFile(relativePath);
    const name = path.basename(relativePath);

    fileInfos.push({
      relativePath,
      info: {
        path: relativePath,
        name,
        type,
        executionContext,
        loc,
        exports: [],
        imports: [],
        isManual: false,
      },
    });
  }

  // Build hierarchical tree
  const root = buildTree(fileInfos);

  const now = new Date().toISOString();
  return {
    projectId: '', // Caller sets this
    repoUrl,
    branch,
    scannedAt: now,
    lastModifiedAt: now,
    root,
    edges: [],
  };
}

interface FileEntry {
  relativePath: string;
  info: FileInfo;
}

function buildTree(fileEntries: FileEntry[]): ArchitectureNode {
  // Group files by their directory
  const dirMap = new Map<string, FileInfo[]>();

  for (const { relativePath, info } of fileEntries) {
    const dir = path.dirname(relativePath);
    const key = dir === '.' ? '' : dir;
    if (!dirMap.has(key)) dirMap.set(key, []);
    dirMap.get(key)!.push(info);
  }

  // Build nodes recursively from root
  const root = buildNode('', 'root', dirMap);
  root.type = 'root';
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

    // Check if key is a direct child of dirPath
    const relative = dirPath ? key.slice(dirPath.length + 1) : key;
    if (!relative || relative.includes('/')) continue;
    // Make sure it actually starts with the parent path
    if (dirPath && !key.startsWith(dirPath + '/')) continue;
    childDirs.add(key);
  }

  const children: ArchitectureNode[] = [];
  for (const childDir of childDirs) {
    const childName = dirPath ? childDir.slice(dirPath.length + 1) : childDir;
    children.push(buildNode(childDir, childName, dirMap));
  }

  // Sort children alphabetically
  children.sort((a, b) => a.name.localeCompare(b.name));

  const metadata = computeMetadata(files, children);
  const executionContext = computeExecutionContext(files, children);

  return {
    id: dirPath || 'root',
    name,
    type: 'folder',
    executionContext,
    children,
    files,
    metadata,
    isManual: false,
  };
}

function computeMetadata(
  files: FileInfo[],
  children: ArchitectureNode[]
): NodeMetadata {
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

  // If we have both client and server-side contexts, it's mixed
  const hasClient = contexts.has('client');
  const hasServer = contexts.has('server') || contexts.has('api') || contexts.has('edge');
  if (hasClient && hasServer) return 'mixed';

  // Default to the first one found
  return [...contexts][0];
}

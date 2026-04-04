// ============================================================
// CORE DATA MODEL
// Represents a codebase architecture as a hierarchical tree.
// This same model is used whether the architecture was:
// - Scanned from an existing repo (import flow)
// - Designed from scratch on the canvas (design flow)
// - A mix of both (import then extend)
// ============================================================

export interface ArchitectureGraph {
  projectId: string;
  repoUrl: string | null;           // null if designed from scratch
  branch: string | null;            // null if designed from scratch
  scannedAt: string | null;         // null if designed from scratch
  lastModifiedAt: string;
  root: ArchitectureNode;
  edges: FlowEdge[];                // All edges across the entire graph
}

export interface ArchitectureNode {
  id: string;                        // Unique ID (path for scanned, generated for manual)
  name: string;                      // Display name
  type: NodeType;
  executionContext: ExecutionContext;
  children: ArchitectureNode[];      // Sub-folders/groups
  files: FileInfo[];                 // Direct files at this level
  metadata: NodeMetadata;
  position?: { x: number; y: number }; // Manual canvas position (if user dragged it)
  isManual: boolean;                 // true if user-created, false if scanned
}

export type NodeType =
  | 'root'
  | 'folder'
  | 'page'
  | 'layout'
  | 'loading'
  | 'error'
  | 'api-route'
  | 'component'
  | 'library'
  | 'hook'
  | 'type-definition'
  | 'middleware'
  | 'config'
  | 'service'              // For manually designed backend services
  | 'database'             // For manually designed database models
  | 'external-api';        // For manually designed external API integrations

export type ExecutionContext =
  | 'client'      // 'use client' directive, runs in browser
  | 'server'      // Default Next.js, runs on server at render time
  | 'api'         // API route handlers
  | 'edge'        // Middleware, edge functions
  | 'build'       // Config files, build-time only
  | 'mixed'       // Folder containing both client and server files
  | 'unspecified'; // For manually designed nodes where context isn't set yet

export interface FileInfo {
  path: string;
  name: string;
  type: NodeType;
  executionContext: ExecutionContext;
  loc: number;
  exports: string[];
  imports: ImportInfo[];
  isManual: boolean;          // true if user-created placeholder
}

export interface ImportInfo {
  source: string;             // Import path as written in code
  resolvedPath: string;       // Resolved to actual file
  specifiers: string[];       // Named imports: ['useState', 'useEffect']
}

export interface NodeMetadata {
  totalFiles: number;
  totalLoc: number;
  clientFileCount: number;
  serverFileCount: number;
  description?: string;       // AI-generated or user-written explanation
  tags?: string[];            // User-defined tags: ['auth', 'billing', 'feature:checkout']
}

export interface FlowEdge {
  id: string;
  source: string;             // Source node ID
  target: string;             // Target node ID
  importCount: number;
  samples: { from: string; to: string }[];
  isManual: boolean;          // true if user drew this edge, false if from scanning
  label?: string;             // User or AI annotation: "auth check", "data fetch"
}

// ============================================================
// NODE PALETTE — available component types for "design from scratch"
// ============================================================

export interface PaletteItem {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  defaultExecutionContext: ExecutionContext;
  category: 'nextjs' | 'backend' | 'data' | 'external';
}

export const NEXTJS_PALETTE: PaletteItem[] = [
  { type: 'page', label: 'Page', description: 'A Next.js page/route', icon: '◈', defaultExecutionContext: 'server', category: 'nextjs' },
  { type: 'layout', label: 'Layout', description: 'A shared layout wrapper', icon: '▣', defaultExecutionContext: 'server', category: 'nextjs' },
  { type: 'api-route', label: 'API Route', description: 'A server-side API endpoint', icon: '⬡', defaultExecutionContext: 'api', category: 'nextjs' },
  { type: 'component', label: 'Component', description: 'A reusable React component', icon: '△', defaultExecutionContext: 'client', category: 'nextjs' },
  { type: 'library', label: 'Library', description: 'A shared utility/service module', icon: '⬢', defaultExecutionContext: 'server', category: 'nextjs' },
  { type: 'hook', label: 'Hook', description: 'A custom React hook', icon: '↻', defaultExecutionContext: 'client', category: 'nextjs' },
  { type: 'middleware', label: 'Middleware', description: 'Edge middleware for request processing', icon: '◇', defaultExecutionContext: 'edge', category: 'nextjs' },
  { type: 'type-definition', label: 'Types', description: 'TypeScript type definitions', icon: '{ }', defaultExecutionContext: 'build', category: 'nextjs' },
  { type: 'service', label: 'Service', description: 'A backend service or business logic module', icon: '▧', defaultExecutionContext: 'server', category: 'backend' },
  { type: 'database', label: 'Database Model', description: 'A database table/collection definition', icon: '◉', defaultExecutionContext: 'server', category: 'data' },
  { type: 'external-api', label: 'External API', description: 'An external API integration', icon: '↗', defaultExecutionContext: 'unspecified', category: 'external' },
];

// ============================================================
// API TYPES
// ============================================================

export interface Project {
  id: string;
  name: string;
  source: 'scratch' | 'github';
  repoUrl: string | null;
  defaultBranch: string | null;
  lastScannedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;             // GitHub user ID
}

export interface CreateProjectRequest {
  name: string;
  source: 'scratch' | 'github';
  repoUrl?: string;
  branch?: string;
}

export interface ScanRequest {
  projectId: string;
  repoUrl: string;
  branch: string;
}

export interface ScanResponse {
  projectId: string;
  status: 'scanning' | 'complete' | 'error';
  architecture?: ArchitectureGraph;
  error?: string;
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  url: string;
}

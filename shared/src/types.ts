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
  skippedImports: SkippedImport[];  // Imports that couldn't be resolved
  enrichment?: Enrichment | null;   // LLM-generated semantic overlay (optional)
}

// ============================================================
// ENRICHMENT LAYER — LLM-generated semantic overlay
// Pure metadata that references the structural graph by ID.
// Never duplicates structural data.
// ============================================================

export interface Enrichment {
  graphHash: string;                           // SHA256 of structural graph — cache key
  systemNarrative: string;                     // Pass 1 prose output
  nodeAnnotations: Record<string, NodeAnnotation>;  // keyed by ArchitectureNode.id / FileInfo.path
  edgeAnnotations: Record<string, EdgeAnnotation>;  // keyed by FlowEdge.id
  groups: SemanticGroup[];
  flows: NamedFlow[];
  overviewNodeIds: string[];                   // 14-24 ids surfaced in Overview view
  generatedAt: string;
  model: string;                               // e.g. "claude-opus-4-6"
  enricherVersion: string;
}

export interface NodeAnnotation {
  semanticRole: string;                        // "Auth middleware", "Scan orchestrator"
  description: string;                         // 1-2 sentences
  layer?: string;                              // "Frontend" | "Backend" | "Shared" | custom
  hideFromOverview: boolean;
}

export interface EdgeAnnotation {
  verbLabel: string;                           // 1-4 word verb phrase
  payload?: string;                            // What moves across this edge
  crossesGroup: boolean;
}

export interface SemanticGroup {
  id: string;
  label: string;
  memberNodeIds: string[];
  tone?: 'blue' | 'amber' | 'mint' | 'rose' | 'indigo' | 'teal';
}

export interface NamedFlow {
  id: string;
  label: string;
  edgeIds: string[];                           // Ordered sequence
}

export type EnrichmentState = 'uninitialized' | 'fresh' | 'stale';

// ============================================================
// Per-user LLM configuration for the enricher + build-agent.
// Stored on the users table; Anthropic key is encrypted at rest.
// ============================================================

export type LLMProvider = 'anthropic' | 'ollama';

export interface UserLLMConfig {
  provider: LLMProvider;
  anthropicApiKey?: string;          // plaintext — only present in memory after decrypt
  ollamaHost?: string;               // e.g. "http://localhost:11434"
  explainModel?: string;
  annotateModel?: string;
}

// Request shape for saving config from frontend.
export interface UpdateLLMConfigRequest {
  provider: LLMProvider;
  anthropicApiKey?: string;          // send plaintext; backend encrypts before storing
  ollamaHost?: string;
  explainModel?: string;
  annotateModel?: string;
}

export interface ArchitectureNode {
  id: string;                        // Unique ID (path for scanned, generated for manual)
  name: string;                      // Display name
  displayName?: string;              // Human-readable name (e.g., "Settings Page", "useAuth")
  type: NodeType;
  executionContext: ExecutionContext;
  children: ArchitectureNode[];      // Sub-folders/groups
  files: FileInfo[];                 // Direct files at this level
  metadata: NodeMetadata;
  folderEdges?: FolderEdges;         // Precomputed edges at this folder level
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
  displayName?: string;       // Human-readable name (e.g., "Button", "useAuth")
  type: NodeType;
  executionContext: ExecutionContext;
  loc: number;
  exports: string[];
  imports: ImportInfo[];
  reExports: ReExportInfo[];  // Re-exports this file passes through (barrel files)
  isManual: boolean;          // true if user-created placeholder
  position?: { x: number; y: number }; // Canvas position for file nodes
}

export type ImportKind =
  | 'static'        // import { x } from — standard ES6, runtime data flow
  | 'type-only'     // import type { x } from — erased at compile time
  | 'dynamic'       // import('./path') — lazy/code-split, deferred data flow
  | 'commonjs'      // require('./path') — CJS runtime
  | 'side-effect'   // import './styles' — no specifiers, just execution
  | 're-export';    // export { x } from / export * from — pass-through

export interface ImportInfo {
  source: string;             // Import path as written in code
  resolvedPath: string;       // Resolved to actual file
  specifiers: string[];       // Named imports: ['useState', 'useEffect']
  kind: ImportKind;           // Classification of this import
  isDataFlow: boolean;        // true if runtime data movement (static/dynamic/commonjs/re-export)
}

export interface ReExportInfo {
  source: string;             // Module specifier as written
  resolvedPath: string;       // Resolved to actual file
  specifiers: string[];       // Specific names, or ['*'] for star re-export
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
  dataFlowCount: number;      // Imports that are actual runtime data flow
  typeOnlyCount: number;      // Type-only imports (erased at compile time)
  hasDynamic: boolean;        // Any dynamic imports in this edge?
  samples: { from: string; to: string }[];
  isManual: boolean;          // true if user drew this edge, false if from scanning
  label?: string;             // User or AI annotation: "auth check", "data fetch"
}

// ============================================================
// EDGE AGGREGATION — precomputed edges at each folder level
// ============================================================

export interface FolderEdges {
  internal: FlowEdge[];     // Edges between direct children of this folder
  outbound: FlowEdge[];     // Edges from children to nodes outside this folder
}

export interface SkippedImport {
  sourceFile: string;       // File that contains the import
  importPath: string;       // The unresolved module specifier
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

export interface ProjectContributor {
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  source: 'scratch' | 'github';
  repoUrl: string | null;
  defaultBranch: string | null;
  lastScannedAt: string | null;
  contributors: ProjectContributor[];
  createdAt: string;
  updatedAt: string;
  userId: string;             // GitHub user ID
}

export interface CreateProjectRequest {
  name: string;
  source: 'scratch' | 'github';
  repoUrl?: string;
  branch?: string;
  contributors?: ProjectContributor[];
}

export interface GitHubContributor {
  login: string;
  avatarUrl: string;
  contributions: number;
  name?: string | null;
  email?: string | null;
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
  skippedImports?: SkippedImport[];
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

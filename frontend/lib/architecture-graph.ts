import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import type {
  ArchitectureGraph,
  ArchitectureNode,
  FileInfo,
  ExecutionContext,
  NodeType,
} from '@vibeboard/shared';

// ============================================================
// Context colors — execution context → visual styling
// ============================================================

export const CONTEXT_COLORS: Record<ExecutionContext, { bg: string; border: string; text: string }> = {
  client:      { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.4)',  text: '#f59e0b' },
  server:      { bg: 'rgba(59, 130, 246, 0.08)',  border: 'rgba(59, 130, 246, 0.4)',  text: '#3b82f6' },
  api:         { bg: 'rgba(34, 197, 94, 0.08)',   border: 'rgba(34, 197, 94, 0.4)',   text: '#22c55e' },
  edge:        { bg: 'rgba(168, 85, 247, 0.08)',  border: 'rgba(168, 85, 247, 0.4)',  text: '#a855f7' },
  build:       { bg: 'rgba(148, 163, 184, 0.06)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' },
  mixed:       { bg: 'rgba(148, 163, 184, 0.06)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' },
  unspecified: { bg: 'rgba(148, 163, 184, 0.04)', border: 'rgba(148, 163, 184, 0.2)', text: '#64748b' },
};

// ============================================================
// Node type → icon name (lucide icon names)
// ============================================================

export const NODE_TYPE_ICONS: Record<NodeType, string> = {
  root: 'FolderRoot',
  folder: 'Folder',
  page: 'FileText',
  layout: 'LayoutDashboard',
  loading: 'Loader2',
  error: 'AlertCircle',
  'api-route': 'Globe',
  component: 'Component',
  library: 'Library',
  hook: 'RefreshCw',
  'type-definition': 'Braces',
  middleware: 'Shield',
  config: 'Settings',
  service: 'Server',
  database: 'Database',
  'external-api': 'ExternalLink',
};

// ============================================================
// Find a node at a given path
// ============================================================

export function findNodeAtPath(
  root: ArchitectureNode,
  pathStr: string
): ArchitectureNode | null {
  if (!pathStr || pathStr === 'root') return root;

  const segments = pathStr.split('/');
  let current = root;

  for (const segment of segments) {
    const child = current.children.find(
      (c) => c.name === segment || c.id === (current.id === 'root' ? segment : `${current.id}/${segment}`)
    );
    if (!child) return null;
    current = child;
  }

  return current;
}

// ============================================================
// Convert ArchitectureGraph to React Flow nodes + edges
// ============================================================

const FOLDER_WIDTH = 280;
const FOLDER_HEIGHT = 120;
const FILE_WIDTH = 220;
const FILE_HEIGHT = 70;
const INFRA_WIDTH = 240;
const INFRA_HEIGHT = 90;

export function convertToReactFlow(
  architecture: ArchitectureGraph,
  currentPath: string
): { nodes: Node[]; edges: Edge[] } {
  const currentNode = findNodeAtPath(architecture.root, currentPath);
  if (!currentNode) return { nodes: [], edges: [] };

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const infraTypes: NodeType[] = ['service', 'database', 'external-api'];

  // Convert children to nodes
  for (const child of currentNode.children) {
    const nodeType = infraTypes.includes(child.type) ? 'infra-node' : 'folder-node';
    const size = nodeType === 'infra-node'
      ? { width: INFRA_WIDTH, height: INFRA_HEIGHT }
      : { width: FOLDER_WIDTH, height: FOLDER_HEIGHT };

    nodes.push({
      id: child.id,
      type: nodeType,
      position: child.position ?? { x: 0, y: 0 },
      data: {
        node: child,
        colors: CONTEXT_COLORS[child.executionContext],
      },
      width: size.width,
      height: size.height,
    });
  }

  // Convert files to nodes
  for (const file of currentNode.files) {
    nodes.push({
      id: file.path,
      type: 'file-node',
      position: file.position ?? { x: 0, y: 0 },
      data: {
        file,
        colors: CONTEXT_COLORS[file.executionContext],
      },
      width: FILE_WIDTH,
      height: FILE_HEIGHT,
    });
  }

  // Convert folder edges to React Flow edges
  if (currentNode.folderEdges) {
    for (const edge of currentNode.folderEdges.internal) {
      // Only add edges where both source and target are visible nodes
      const sourceExists = nodes.some((n) => n.id === edge.source);
      const targetExists = nodes.some((n) => n.id === edge.target);
      if (!sourceExists || !targetExists) continue;

      edges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'architecture-edge',
        data: {
          importCount: edge.importCount,
          dataFlowCount: edge.dataFlowCount,
          typeOnlyCount: edge.typeOnlyCount,
          hasDynamic: edge.hasDynamic,
          samples: edge.samples,
        },
      });
    }
  }

  // Run dagre layout for nodes without saved positions
  applyDagreLayout(nodes, edges);

  return { nodes, edges };
}

// ============================================================
// Dagre auto-layout
// ============================================================

function applyDagreLayout(nodes: Node[], edges: Edge[]): void {
  // Check if all nodes already have positions (manual placement)
  const needsLayout = nodes.some((n) => n.position.x === 0 && n.position.y === 0);
  if (!needsLayout) return;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: node.width ?? 280, height: node.height ?? 120 });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  for (const node of nodes) {
    // Only set position if node doesn't have a saved one
    if (node.position.x === 0 && node.position.y === 0) {
      const dagreNode = g.node(node.id);
      if (dagreNode) {
        node.position = {
          x: dagreNode.x - (node.width ?? 280) / 2,
          y: dagreNode.y - (node.height ?? 120) / 2,
        };
      }
    }
  }
}

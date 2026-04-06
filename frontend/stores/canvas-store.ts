import { create } from 'zustand';
import type { Node, Edge } from 'reactflow';
import type { ArchitectureGraph, ArchitectureNode, Project } from '@vibeboard/shared';
import { convertToReactFlow } from '@/lib/architecture-graph';

interface CanvasStore {
  project: Project | null;
  architecture: ArchitectureGraph | null;
  currentPath: string;
  navigationHistory: string[];
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // Navigation
  navigateIn: (path: string) => void;
  navigateBack: () => void;
  navigateToRoot: () => void;
  navigateTo: (path: string) => void;

  // Selection / hover
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;

  // Position persistence
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;

  // Manual editing (design from scratch)
  addNode: (node: ArchitectureNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<ArchitectureNode>) => void;
  addEdge: (source: string, target: string) => void;
  removeEdge: (edgeId: string) => void;

  // Loading
  loadArchitecture: (graph: ArchitectureGraph) => void;
  setProject: (project: Project) => void;

  // React Flow state sync
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}

function recompute(architecture: ArchitectureGraph | null, path: string) {
  if (!architecture) return { nodes: [], edges: [] };
  return convertToReactFlow(architecture, path);
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  project: null,
  architecture: null,
  currentPath: '',
  navigationHistory: [],
  nodes: [],
  edges: [],
  selectedNodeId: null,
  hoveredNodeId: null,

  navigateIn: (path) => {
    const state = get();
    const { nodes, edges } = recompute(state.architecture, path);
    set({
      currentPath: path,
      navigationHistory: [...state.navigationHistory, state.currentPath],
      nodes,
      edges,
      selectedNodeId: null,
      hoveredNodeId: null,
    });
  },

  navigateBack: () => {
    const state = get();
    const history = [...state.navigationHistory];
    const previousPath = history.pop() ?? '';
    const { nodes, edges } = recompute(state.architecture, previousPath);
    set({
      currentPath: previousPath,
      navigationHistory: history,
      nodes,
      edges,
      selectedNodeId: null,
      hoveredNodeId: null,
    });
  },

  navigateToRoot: () => {
    const state = get();
    const { nodes, edges } = recompute(state.architecture, '');
    set({
      currentPath: '',
      navigationHistory: [],
      nodes,
      edges,
      selectedNodeId: null,
      hoveredNodeId: null,
    });
  },

  navigateTo: (path) => {
    const state = get();
    const { nodes, edges } = recompute(state.architecture, path);
    set({
      currentPath: path,
      navigationHistory: [],
      nodes,
      edges,
      selectedNodeId: null,
      hoveredNodeId: null,
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),

  updateNodePosition: (nodeId, position) => {
    const state = get();
    // Update React Flow node position
    const nodes = state.nodes.map((n) =>
      n.id === nodeId ? { ...n, position } : n
    );
    // Also update the ArchitectureNode/FileInfo position in the graph for persistence
    if (state.architecture) {
      updatePositionInGraph(state.architecture.root, nodeId, position);
    }
    set({ nodes });
  },

  addNode: (_node) => { /* TODO: design-from-scratch mode */ },
  removeNode: (_nodeId) => { /* TODO */ },
  updateNode: (_nodeId, _updates) => { /* TODO */ },
  addEdge: (_source, _target) => { /* TODO */ },
  removeEdge: (_edgeId) => { /* TODO */ },

  loadArchitecture: (graph) => {
    const { nodes, edges } = recompute(graph, '');
    set({
      architecture: graph,
      currentPath: '',
      navigationHistory: [],
      nodes,
      edges,
      selectedNodeId: null,
      hoveredNodeId: null,
    });
  },

  setProject: (project) => set({ project }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
}));

function updatePositionInGraph(
  node: ArchitectureNode,
  targetId: string,
  position: { x: number; y: number }
): void {
  if (node.id === targetId) {
    node.position = position;
    return;
  }
  for (const file of node.files) {
    if (file.path === targetId) {
      file.position = position;
      return;
    }
  }
  for (const child of node.children) {
    updatePositionInGraph(child, targetId, position);
  }
}

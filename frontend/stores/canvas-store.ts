import { create } from 'zustand';
import type { Node, Edge } from 'reactflow';
import type { ArchitectureGraph, ArchitectureNode, Project } from '@vibeboard/shared';

// TODO: Implement all actions — currently just the interface and initial state

interface CanvasStore {
  // Current project
  project: Project | null;
  architecture: ArchitectureGraph | null;

  // Navigation — which level of the hierarchy we're viewing
  currentPath: string;  // e.g., "" for root, "app/dashboard" for drill-down
  navigationHistory: string[];

  // Canvas nodes and edges (React Flow format, derived from architecture at current path)
  nodes: Node[];
  edges: Edge[];

  // Actions
  navigateIn: (path: string) => void;
  navigateBack: () => void;
  navigateToRoot: () => void;

  // For "design from scratch" — manually adding nodes
  addNode: (node: ArchitectureNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<ArchitectureNode>) => void;
  addEdge: (source: string, target: string) => void;
  removeEdge: (edgeId: string) => void;

  // For "import repo" — loading scanned architecture
  loadArchitecture: (graph: ArchitectureGraph) => void;

  // React Flow state sync
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  project: null,
  architecture: null,
  currentPath: '',
  navigationHistory: [],
  nodes: [],
  edges: [],

  navigateIn: (path) =>
    set((state) => ({
      currentPath: path,
      navigationHistory: [...state.navigationHistory, state.currentPath],
      // TODO: Recompute nodes/edges from architecture at the new path
    })),

  navigateBack: () =>
    set((state) => {
      const history = [...state.navigationHistory];
      const previousPath = history.pop() ?? '';
      return {
        currentPath: previousPath,
        navigationHistory: history,
        // TODO: Recompute nodes/edges from architecture at the previous path
      };
    }),

  navigateToRoot: () =>
    set({
      currentPath: '',
      navigationHistory: [],
      // TODO: Recompute nodes/edges from architecture at root
    }),

  addNode: (_node) => {
    // TODO: Add node to architecture graph and update React Flow nodes
  },

  removeNode: (_nodeId) => {
    // TODO: Remove node from architecture graph and update React Flow nodes
  },

  updateNode: (_nodeId, _updates) => {
    // TODO: Update node in architecture graph and update React Flow nodes
  },

  addEdge: (_source, _target) => {
    // TODO: Add edge to architecture graph and update React Flow edges
  },

  removeEdge: (_edgeId) => {
    // TODO: Remove edge from architecture graph and update React Flow edges
  },

  loadArchitecture: (graph) =>
    set({
      architecture: graph,
      currentPath: '',
      navigationHistory: [],
      // TODO: Convert root-level ArchitectureNodes to React Flow nodes/edges
    }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
}));

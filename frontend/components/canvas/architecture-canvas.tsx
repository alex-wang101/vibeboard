'use client';

import { useMemo, useCallback } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useCanvasStore } from '@/stores/canvas-store';
import { FolderNode } from './nodes/folder-node';
import { FileNode } from './nodes/file-node';
import { InfraNode } from './nodes/infra-node';
import { ArchitectureEdge } from './edges/architecture-edge';
import { HoverPreview } from './hover-preview';
import { CONTEXT_COLORS } from '@/lib/architecture-graph';

const nodeTypes = {
  'folder-node': FolderNode,
  'file-node': FileNode,
  'infra-node': InfraNode,
};

const edgeTypes = {
  'architecture-edge': ArchitectureEdge,
};

export function ArchitectureCanvas() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const hoverNode = useCanvasStore((s) => s.hoverNode);
  const updateNodePosition = useCanvasStore((s) => s.updateNodePosition);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => selectNode(node.id),
    [selectNode]
  );

  const onPaneClick = useCallback(() => selectNode(null), [selectNode]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (_e, node) => hoverNode(node.id),
    [hoverNode]
  );

  const onNodeMouseLeave = useCallback(() => hoverNode(null), [hoverNode]);

  const onNodeDragStop: NodeMouseHandler = useCallback(
    (_e, node) => updateNodePosition(node.id, node.position),
    [updateNodePosition]
  );

  const minimapNodeColor = useCallback(
    (node: { data?: Record<string, unknown> }) => {
      const ctx =
        (node.data?.node as { executionContext?: string } | undefined)?.executionContext ??
        (node.data?.file as { executionContext?: string } | undefined)?.executionContext ??
        'unspecified';
      return CONTEXT_COLORS[ctx as keyof typeof CONTEXT_COLORS]?.text ?? '#64748b';
    },
    []
  );

  const memoNodeTypes = useMemo(() => nodeTypes, []);
  const memoEdgeTypes = useMemo(() => edgeTypes, []);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={memoNodeTypes}
        edgeTypes={memoEdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ duration: 300, padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.03)" gap={20} />
        <Controls className="!bg-white/5 !border-white/10 !rounded-lg [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white/40 [&>button:hover]:!text-white/70" />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-white/5 !border-white/10 !rounded-lg"
        />
      </ReactFlow>
      <HoverPreview />
    </div>
  );
}

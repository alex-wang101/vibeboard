import { createHash } from 'crypto';
import type { ArchitectureGraph, ArchitectureNode, FlowEdge } from '@vibeboard/shared';

function collectNodeIds(node: ArchitectureNode, out: string[]): void {
  out.push(node.id);
  for (const f of node.files) out.push(f.path);
  for (const c of node.children) collectNodeIds(c, out);
}

export function hashArchitectureGraph(graph: ArchitectureGraph): string {
  const nodeIds: string[] = [];
  collectNodeIds(graph.root, nodeIds);
  nodeIds.sort();

  const edgeKeys = graph.edges
    .map((e: FlowEdge) => `${e.id}|${e.source}->${e.target}|ic:${e.importCount}|df:${e.dataFlowCount}`)
    .sort();

  const h = createHash('sha256');
  h.update('v1\n');
  h.update(`nodes:${nodeIds.length}\n`);
  for (const id of nodeIds) h.update(id + '\n');
  h.update(`edges:${edgeKeys.length}\n`);
  for (const k of edgeKeys) h.update(k + '\n');
  return 'sha256:' + h.digest('hex');
}

export interface StructuralDelta {
  addedNodes: number;
  removedNodes: number;
  addedEdges: number;
  removedEdges: number;
  totalNodes: number;
  changeRatio: number;
}

export function computeDelta(prev: ArchitectureGraph, next: ArchitectureGraph): StructuralDelta {
  const prevIds = new Set<string>();
  const nextIds = new Set<string>();
  const prevList: string[] = [];
  const nextList: string[] = [];
  collectNodeIds(prev.root, prevList);
  collectNodeIds(next.root, nextList);
  prevList.forEach(id => prevIds.add(id));
  nextList.forEach(id => nextIds.add(id));

  let addedNodes = 0;
  let removedNodes = 0;
  for (const id of nextIds) if (!prevIds.has(id)) addedNodes++;
  for (const id of prevIds) if (!nextIds.has(id)) removedNodes++;

  const prevEdgeIds = new Set(prev.edges.map(e => e.id));
  const nextEdgeIds = new Set(next.edges.map(e => e.id));
  let addedEdges = 0;
  let removedEdges = 0;
  for (const id of nextEdgeIds) if (!prevEdgeIds.has(id)) addedEdges++;
  for (const id of prevEdgeIds) if (!nextEdgeIds.has(id)) removedEdges++;

  const totalNodes = nextIds.size;
  const changeRatio = totalNodes === 0 ? 1 : (addedNodes + removedNodes) / totalNodes;

  return { addedNodes, removedNodes, addedEdges, removedEdges, totalNodes, changeRatio };
}

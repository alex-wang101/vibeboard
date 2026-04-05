'use client';

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ArchitectureGraph, ArchitectureNode, FlowEdge } from '@vibeboard/shared';

export function DebugEdges({ graph }: { graph: ArchitectureGraph }) {
  const folders = useMemo(() => collectFolders(graph.root), [graph]);
  const [selectedPath, setSelectedPath] = useState(folders[0]?.id ?? 'root');
  const selectedNode = useMemo(
    () => findNode(graph.root, selectedPath),
    [graph, selectedPath]
  );

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Folder selector */}
      <div className="flex items-center gap-2">
        <span className="text-white/40 text-[10px] uppercase tracking-wider">Folder level:</span>
        <Select value={selectedPath} onValueChange={setSelectedPath}>
          <SelectTrigger className="w-[300px] h-8 bg-white/5 border-white/10 text-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {folders.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-xs font-mono">
                {f.id || '(root)'} ({f.metadata.totalFiles}f)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedNode?.folderEdges ? (
        <div className="space-y-6">
          {/* Internal edges */}
          <EdgeSection
            title="Internal edges"
            subtitle="Between children of this folder"
            edges={selectedNode.folderEdges.internal}
          />

          {/* Outbound edges */}
          <EdgeSection
            title="Outbound edges"
            subtitle="From children to outside this folder"
            edges={selectedNode.folderEdges.outbound}
          />
        </div>
      ) : (
        <div className="text-white/30 py-8 text-center">
          No edge data for this folder
        </div>
      )}
    </div>
  );
}

function EdgeSection({
  title,
  subtitle,
  edges,
}: {
  title: string;
  subtitle: string;
  edges: FlowEdge[];
}) {
  if (edges.length === 0) {
    return (
      <div>
        <div className="text-white/50 text-sm font-sans">{title}</div>
        <div className="text-white/20 text-[10px]">{subtitle}</div>
        <div className="text-white/20 py-2 pl-2">None</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-white/50 text-sm font-sans">{title}</div>
      <div className="text-white/20 text-[10px] mb-2">{subtitle}</div>
      <div className="space-y-2">
        {edges
          .sort((a, b) => b.importCount - a.importCount)
          .map((edge) => (
            <div key={edge.id} className="border border-white/5 rounded p-2 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-white/60">{lastSegment(edge.source)}</span>
                <span className="text-white/20">→</span>
                <span className="text-white/60">{lastSegment(edge.target)}</span>
                <span className="text-white/30 ml-auto">{edge.importCount} imports</span>
              </div>
              {edge.samples.length > 0 && (
                <div className="mt-1 pl-2 space-y-0.5">
                  {edge.samples.map((s, i) => (
                    <div key={i} className="text-white/20">
                      {s.from} → {s.to}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

function lastSegment(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function collectFolders(node: ArchitectureNode): ArchitectureNode[] {
  const result: ArchitectureNode[] = [node];
  for (const child of node.children) {
    result.push(...collectFolders(child));
  }
  return result;
}

function findNode(root: ArchitectureNode, id: string): ArchitectureNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

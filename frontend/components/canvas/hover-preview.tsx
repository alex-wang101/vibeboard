'use client';

import { useEffect, useState } from 'react';
import { useCanvasStore } from '@/stores/canvas-store';
import { findNodeAtPath } from '@/lib/architecture-graph';
import type { ArchitectureNode, FileInfo } from '@vibeboard/shared';

export function HoverPreview() {
  const hoveredNodeId = useCanvasStore((s) => s.hoveredNodeId);
  const architecture = useCanvasStore((s) => s.architecture);
  const nodes = useCanvasStore((s) => s.nodes);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 300ms delay before showing
  useEffect(() => {
    if (!hoveredNodeId) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, [hoveredNodeId]);

  // Get position from the hovered node
  useEffect(() => {
    if (!hoveredNodeId) return;
    const rfNode = nodes.find((n) => n.id === hoveredNodeId);
    if (rfNode) {
      setPosition({
        x: rfNode.position.x + (rfNode.width ?? 280) + 16,
        y: rfNode.position.y,
      });
    }
  }, [hoveredNodeId, nodes]);

  if (!visible || !hoveredNodeId || !architecture) return null;

  // Find the data for the hovered item
  const archNode = findNodeInTree(architecture.root, hoveredNodeId);
  const fileInfo = findFileInTree(architecture.root, hoveredNodeId);

  if (!archNode && !fileInfo) return null;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div className="bg-black/90 backdrop-blur-lg border border-white/10 rounded-xl p-4 max-w-[300px] shadow-2xl">
        {fileInfo ? (
          <FilePreview file={fileInfo} />
        ) : archNode ? (
          <FolderPreview node={archNode} />
        ) : null}
      </div>
    </div>
  );
}

function FilePreview({ file }: { file: FileInfo }) {
  return (
    <>
      <div className="font-mono text-[11px] text-white/40 truncate mb-2">{file.path}</div>
      <div className="text-white/70 text-xs font-medium mb-2">{file.displayName ?? file.name}</div>

      {file.exports.length > 0 && (
        <div className="mb-2">
          <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Exports</div>
          <div className="text-white/50 text-[11px] font-mono">
            {file.exports.slice(0, 5).join(', ')}
            {file.exports.length > 5 && <span className="text-white/20"> +{file.exports.length - 5}</span>}
          </div>
        </div>
      )}

      {file.imports.length > 0 && (
        <div className="mb-2">
          <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Imports from</div>
          {file.imports.slice(0, 4).map((imp, i) => (
            <div key={i} className="text-white/40 text-[10px] font-mono truncate">
              {imp.resolvedPath.split('/').pop()}
              <span className="text-white/20 ml-1">[{imp.kind}]</span>
            </div>
          ))}
          {file.imports.length > 4 && (
            <div className="text-white/20 text-[10px]">+{file.imports.length - 4} more</div>
          )}
        </div>
      )}

      <div className="text-white/20 text-[10px]">{file.loc} lines</div>
    </>
  );
}

function FolderPreview({ node }: { node: ArchitectureNode }) {
  const topFiles = [...node.files]
    .sort((a, b) => b.loc - a.loc)
    .slice(0, 5);

  return (
    <>
      <div className="font-mono text-[11px] text-white/40 truncate mb-2">{node.id || 'root'}</div>
      <div className="text-white/70 text-xs font-medium mb-2">{node.displayName ?? node.name}</div>

      <div className="text-white/30 text-[10px] flex gap-3 mb-2">
        <span>{node.metadata.totalFiles} files</span>
        <span>{node.metadata.totalLoc.toLocaleString()} LOC</span>
      </div>

      {topFiles.length > 0 && (
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Top files</div>
          {topFiles.map((f) => (
            <div key={f.path} className="text-white/40 text-[10px] font-mono flex justify-between">
              <span className="truncate mr-2">{f.name}</span>
              <span className="text-white/20 shrink-0">{f.loc}L</span>
            </div>
          ))}
        </div>
      )}

      {node.folderEdges && node.folderEdges.outbound.length > 0 && (
        <div className="mt-2">
          <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">
            {node.folderEdges.outbound.length} outbound deps
          </div>
        </div>
      )}
    </>
  );
}

function findNodeInTree(root: ArchitectureNode, id: string): ArchitectureNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeInTree(child, id);
    if (found) return found;
  }
  return null;
}

function findFileInTree(root: ArchitectureNode, path: string): FileInfo | null {
  for (const file of root.files) {
    if (file.path === path) return file;
  }
  for (const child of root.children) {
    const found = findFileInTree(child, path);
    if (found) return found;
  }
  return null;
}

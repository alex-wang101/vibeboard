'use client';

import { useCanvasStore } from '@/stores/canvas-store';
import { findNodeAtPath, CONTEXT_COLORS } from '@/lib/architecture-graph';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import type { ArchitectureNode, FileInfo, ImportKind } from '@vibeboard/shared';

const KIND_COLORS: Record<ImportKind, string> = {
  static: 'bg-green-500',
  'type-only': 'bg-gray-400',
  dynamic: 'bg-orange-500',
  commonjs: 'bg-yellow-500',
  'side-effect': 'bg-red-400',
  're-export': 'bg-blue-400',
};

export function DetailPanel() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const architecture = useCanvasStore((s) => s.architecture);
  const selectNode = useCanvasStore((s) => s.selectNode);

  if (!selectedNodeId || !architecture) return null;

  // Find the selected item — could be a folder node or a file
  const archNode = findNodeInTree(architecture.root, selectedNodeId);
  const fileInfo = findFileInTree(architecture.root, selectedNodeId);

  if (!archNode && !fileInfo) return null;

  const ctx = archNode?.executionContext ?? fileInfo?.executionContext ?? 'unspecified';
  const colors = CONTEXT_COLORS[ctx];

  return (
    <div className="w-80 border-l border-white/10 bg-black/60 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white/80 text-sm font-medium truncate">
          {archNode?.displayName ?? fileInfo?.displayName ?? selectedNodeId}
        </h2>
        <button
          onClick={() => selectNode(null)}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Context badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5"
              style={{ color: colors.text, borderColor: colors.border }}
            >
              {ctx}
            </Badge>
            <span className="text-white/30 text-[10px]">
              {archNode?.type ?? fileInfo?.type}
            </span>
          </div>

          {/* Path */}
          <div className="font-mono text-[10px] text-white/30 break-all">
            {archNode?.id ?? fileInfo?.path}
          </div>

          {fileInfo ? (
            <FileDetail file={fileInfo} />
          ) : archNode ? (
            <FolderDetail node={archNode} />
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

function FileDetail({ file }: { file: FileInfo }) {
  return (
    <>
      <Stat label="Lines of code" value={file.loc.toLocaleString()} />

      {/* Exports */}
      {file.exports.length > 0 && (
        <Section title={`Exports (${file.exports.length})`}>
          <div className="space-y-0.5">
            {file.exports.map((exp) => (
              <div key={exp} className="text-white/50 text-[11px] font-mono">{exp}</div>
            ))}
          </div>
        </Section>
      )}

      {/* Imports */}
      {file.imports.length > 0 && (
        <Section title={`Imports (${file.imports.length})`}>
          <div className="space-y-1.5">
            {file.imports.map((imp, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className={`h-2 w-2 rounded-full shrink-0 mt-1 ${KIND_COLORS[imp.kind]}`} />
                <div className="min-w-0">
                  <div className="text-white/50 text-[11px] font-mono truncate">
                    {imp.resolvedPath.split('/').pop()}
                  </div>
                  {imp.specifiers.length > 0 && (
                    <div className="text-white/25 text-[9px] font-mono truncate">
                      {imp.specifiers.join(', ')}
                    </div>
                  )}
                </div>
                <span className="text-white/15 text-[9px] ml-auto shrink-0">
                  {imp.kind}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Re-exports */}
      {file.reExports.length > 0 && (
        <Section title={`Re-exports (${file.reExports.length})`}>
          {file.reExports.map((re, i) => (
            <div key={i} className="text-white/40 text-[11px] font-mono truncate">
              {re.specifiers.join(', ')} from {re.resolvedPath.split('/').pop()}
            </div>
          ))}
        </Section>
      )}

      {/* Legend */}
      <Section title="Import kinds">
        <div className="grid grid-cols-2 gap-1">
          {(Object.entries(KIND_COLORS) as [ImportKind, string][]).map(([kind, color]) => (
            <div key={kind} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
              <span className="text-white/25 text-[9px]">{kind}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function FolderDetail({ node }: { node: ArchitectureNode }) {
  const { totalFiles, totalLoc, clientFileCount, serverFileCount } = node.metadata;

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Files" value={totalFiles.toString()} />
        <Stat label="LOC" value={totalLoc.toLocaleString()} />
        <Stat label="Client" value={clientFileCount.toString()} />
        <Stat label="Server" value={serverFileCount.toString()} />
      </div>

      {node.children.length > 0 && (
        <Section title={`Children (${node.children.length})`}>
          {node.children.map((child) => (
            <div key={child.id} className="flex items-center justify-between text-[11px]">
              <span className="text-white/50 truncate">{child.name}</span>
              <span className="text-white/20">{child.metadata.totalFiles}f</span>
            </div>
          ))}
        </Section>
      )}

      {node.files.length > 0 && (
        <Section title={`Files (${node.files.length})`}>
          {node.files.slice(0, 20).map((file) => (
            <div key={file.path} className="flex items-center justify-between text-[11px]">
              <span className="text-white/50 font-mono truncate">{file.name}</span>
              <span className="text-white/20">{file.loc}L</span>
            </div>
          ))}
          {node.files.length > 20 && (
            <div className="text-white/15 text-[10px]">+{node.files.length - 20} more</div>
          )}
        </Section>
      )}

      {node.folderEdges && (
        <>
          {node.folderEdges.internal.length > 0 && (
            <Section title={`Internal edges (${node.folderEdges.internal.length})`}>
              {node.folderEdges.internal.slice(0, 10).map((edge) => (
                <div key={edge.id} className="text-white/30 text-[10px] font-mono">
                  {edge.source.split('/').pop()} → {edge.target.split('/').pop()} ({edge.importCount})
                </div>
              ))}
            </Section>
          )}
          {node.folderEdges.outbound.length > 0 && (
            <Section title={`Outbound deps (${node.folderEdges.outbound.length})`}>
              {node.folderEdges.outbound.slice(0, 10).map((edge) => (
                <div key={edge.id} className="text-white/30 text-[10px] font-mono">
                  {edge.source.split('/').pop()} → {edge.target} ({edge.importCount})
                </div>
              ))}
            </Section>
          )}
        </>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
      <div className="text-white/70 text-sm font-medium">{value}</div>
      <div className="text-white/25 text-[10px]">{label}</div>
    </div>
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

function findFileInTree(root: ArchitectureNode, filePath: string): FileInfo | null {
  for (const file of root.files) {
    if (file.path === filePath) return file;
  }
  for (const child of root.children) {
    const found = findFileInTree(child, filePath);
    if (found) return found;
  }
  return null;
}

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Folder, FileText, LayoutDashboard, Globe, Server, Database, ExternalLink, Shield, Settings, Braces, RefreshCw, Loader2, AlertCircle, Component, Library } from 'lucide-react';
import type { ArchitectureNode, NodeType } from '@vibeboard/shared';
import { useCanvasStore } from '@/stores/canvas-store';

const ICONS: Record<NodeType, React.ElementType> = {
  root: Folder, folder: Folder, page: FileText, layout: LayoutDashboard,
  loading: Loader2, error: AlertCircle, 'api-route': Globe, component: Component,
  library: Library, hook: RefreshCw, 'type-definition': Braces, middleware: Shield,
  config: Settings, service: Server, database: Database, 'external-api': ExternalLink,
};

interface FolderNodeData {
  node: ArchitectureNode;
  colors: { bg: string; border: string; text: string };
}

function FolderNodeComponent({ data }: { data: FolderNodeData }) {
  const { node, colors } = data;
  const navigateIn = useCanvasStore((s) => s.navigateIn);
  const Icon = ICONS[node.type] ?? Folder;

  const { totalFiles, totalLoc, clientFileCount, serverFileCount } = node.metadata;
  const total = clientFileCount + serverFileCount;
  const clientPct = total > 0 ? (clientFileCount / total) * 100 : 0;

  return (
    <div
      className="rounded-xl px-4 py-3 min-w-[280px] cursor-pointer select-none"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
      onDoubleClick={() => navigateIn(node.id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/20 !border-none !w-2 !h-2" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: colors.text }} />
          <span className="text-white/90 text-sm font-medium truncate max-w-[160px]">
            {node.displayName ?? node.name}
          </span>
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full border"
          style={{ color: colors.text, borderColor: colors.border }}
        >
          {node.executionContext}
        </span>
      </div>

      <div className="text-white/40 text-[11px] flex items-center gap-3 mb-2">
        <span>{totalFiles} files</span>
        <span>{totalLoc.toLocaleString()} LOC</span>
      </div>

      {total > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${clientPct}%`,
                background: `linear-gradient(90deg, #f59e0b ${clientPct}%, #3b82f6 ${clientPct}%)`,
              }}
            />
          </div>
          <span className="text-[9px] text-white/30">
            {clientFileCount}c / {serverFileCount}s
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-white/20 !border-none !w-2 !h-2" />
    </div>
  );
}

export const FolderNode = memo(FolderNodeComponent);

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Server, Database, ExternalLink } from 'lucide-react';
import type { ArchitectureNode, NodeType } from '@vibeboard/shared';

const ICONS: Partial<Record<NodeType, React.ElementType>> = {
  service: Server,
  database: Database,
  'external-api': ExternalLink,
};

interface InfraNodeData {
  node: ArchitectureNode;
  colors: { bg: string; border: string; text: string };
}

function InfraNodeComponent({ data }: { data: InfraNodeData }) {
  const { node, colors } = data;
  const Icon = ICONS[node.type] ?? Server;

  return (
    <div
      className="rounded-xl px-4 py-3 min-w-[240px] select-none"
      style={{
        background: colors.bg,
        border: `2px dashed ${colors.border}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/20 !border-none !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" style={{ color: colors.text }} />
        <span className="text-white/80 text-sm font-medium truncate">
          {node.displayName ?? node.name}
        </span>
      </div>

      <div className="text-white/30 text-[11px]">
        {node.metadata.totalFiles} files · {node.metadata.totalLoc} LOC
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-white/20 !border-none !w-2 !h-2" />
    </div>
  );
}

export const InfraNode = memo(InfraNodeComponent);

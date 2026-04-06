import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FileCode } from 'lucide-react';
import type { FileInfo } from '@vibeboard/shared';

interface FileNodeData {
  file: FileInfo;
  colors: { bg: string; border: string; text: string };
}

function FileNodeComponent({ data }: { data: FileNodeData }) {
  const { file, colors } = data;

  return (
    <div
      className="rounded-lg px-3 py-2 min-w-[220px] select-none"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/20 !border-none !w-2 !h-2" />

      <div className="flex items-center gap-2">
        <FileCode className="h-3.5 w-3.5 shrink-0" style={{ color: colors.text }} />
        <span className="text-white/80 text-xs font-medium truncate max-w-[140px]">
          {file.displayName ?? file.name}
        </span>
        <span
          className="text-[9px] px-1 py-0 rounded border ml-auto shrink-0"
          style={{ color: colors.text, borderColor: colors.border }}
        >
          {file.type}
        </span>
      </div>

      <div className="text-white/30 text-[10px] flex items-center gap-2 mt-1">
        {file.exports.length > 0 && <span>{file.exports.length} exp</span>}
        <span>{file.loc}L</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-white/20 !border-none !w-2 !h-2" />
    </div>
  );
}

export const FileNode = memo(FileNodeComponent);

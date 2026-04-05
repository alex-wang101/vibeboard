'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight, Folder, FileCode } from 'lucide-react';
import type {
  ArchitectureGraph,
  ArchitectureNode,
  FileInfo,
  NodeType,
  ExecutionContext,
} from '@vibeboard/shared';

interface ArchitectureTreeWidgetProps {
  graph: ArchitectureGraph;
}

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  root: 'Root',
  folder: 'Folder',
  page: 'Page',
  layout: 'Layout',
  loading: 'Loading',
  error: 'Error',
  'api-route': 'API',
  component: 'Component',
  library: 'Library',
  hook: 'Hook',
  'type-definition': 'Types',
  middleware: 'Middleware',
  config: 'Config',
  service: 'Service',
  database: 'Database',
  'external-api': 'External API',
};

const CONTEXT_COLORS: Record<ExecutionContext, string> = {
  client: 'border-emerald-500/40 text-emerald-400',
  server: 'border-blue-500/40 text-blue-400',
  api: 'border-purple-500/40 text-purple-400',
  edge: 'border-orange-500/40 text-orange-400',
  build: 'border-gray-500/40 text-gray-400',
  mixed: 'border-yellow-500/40 text-yellow-400',
  unspecified: 'border-white/20 text-white/40',
};

export function ArchitectureTreeWidget({ graph }: ArchitectureTreeWidgetProps) {
  const { root } = graph;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-3 text-xs text-white/50">
        <span>{root.metadata.totalFiles} files</span>
        <span>{root.metadata.totalLoc.toLocaleString()} lines</span>
        {graph.branch && <span>branch: {graph.branch}</span>}
        {graph.scannedAt && (
          <span>
            scanned:{' '}
            {new Date(graph.scannedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Tree */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 max-h-[400px] overflow-y-auto">
        {root.children.map((child) => (
          <TreeNode key={child.id} node={child} depth={0} />
        ))}
        {root.files.map((file) => (
          <FileLeaf key={file.path} file={file} depth={0} />
        ))}
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: ArchitectureNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0 || node.files.length > 0;

  if (!hasChildren) {
    return (
      <div
        className="flex items-center gap-2 py-1 text-sm text-white/70"
        style={{ paddingLeft: depth * 16 }}
      >
        <Folder className="h-3.5 w-3.5 text-white/30 shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex items-center gap-2 py-1 w-full text-left text-sm text-white/70 hover:text-white transition-colors"
          style={{ paddingLeft: depth * 16 }}
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-white/30 transition-transform ${
              open ? 'rotate-90' : ''
            }`}
          />
          <Folder className="h-3.5 w-3.5 text-white/30 shrink-0" />
          <span className="truncate font-medium">{node.name}</span>
          <Badge
            variant="outline"
            className="ml-auto text-[10px] px-1.5 py-0 border-white/10 text-white/30 shrink-0"
          >
            {node.metadata.totalFiles}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {node.children.map((child) => (
          <TreeNode key={child.id} node={child} depth={depth + 1} />
        ))}
        {node.files.map((file) => (
          <FileLeaf key={file.path} file={file} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FileLeaf({ file, depth }: { file: FileInfo; depth: number }) {
  return (
    <div
      className="flex items-center gap-2 py-1 text-sm"
      style={{ paddingLeft: depth * 16 + 20 }}
    >
      <FileCode className="h-3.5 w-3.5 text-white/20 shrink-0" />
      <span className="text-white/60 truncate">{file.name}</span>
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 shrink-0 ${CONTEXT_COLORS[file.executionContext]}`}
      >
        {NODE_TYPE_LABELS[file.type]}
      </Badge>
      <span className="text-white/20 text-[10px] ml-auto shrink-0">
        {file.loc}L
      </span>
    </div>
  );
}

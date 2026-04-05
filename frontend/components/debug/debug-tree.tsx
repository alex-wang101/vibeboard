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
  ArchitectureNode,
  FileInfo,
  NodeType,
  ExecutionContext,
} from '@vibeboard/shared';

const TYPE_COLORS: Record<NodeType, string> = {
  root: 'bg-gray-500',
  folder: 'bg-gray-500',
  page: 'bg-blue-500',
  layout: 'bg-indigo-500',
  loading: 'bg-cyan-500',
  error: 'bg-red-500',
  'api-route': 'bg-green-500',
  component: 'bg-orange-500',
  library: 'bg-yellow-500',
  hook: 'bg-pink-500',
  'type-definition': 'bg-slate-400',
  middleware: 'bg-violet-500',
  config: 'bg-stone-500',
  service: 'bg-teal-500',
  database: 'bg-emerald-500',
  'external-api': 'bg-sky-500',
};

const CONTEXT_LABELS: Record<ExecutionContext, { label: string; color: string }> = {
  client: { label: 'client', color: 'text-emerald-400 border-emerald-500/40' },
  server: { label: 'server', color: 'text-blue-400 border-blue-500/40' },
  api: { label: 'api', color: 'text-purple-400 border-purple-500/40' },
  edge: { label: 'edge', color: 'text-orange-400 border-orange-500/40' },
  build: { label: 'build', color: 'text-gray-400 border-gray-500/40' },
  mixed: { label: 'mixed', color: 'text-yellow-400 border-yellow-500/40' },
  unspecified: { label: '?', color: 'text-white/30 border-white/10' },
};

export function DebugTree({ root }: { root: ArchitectureNode }) {
  return (
    <div className="font-mono text-xs">
      {root.children.map((child) => (
        <FolderNode key={child.id} node={child} depth={0} />
      ))}
      {root.files.map((file) => (
        <FileNode key={file.path} file={file} depth={0} />
      ))}
    </div>
  );
}

function FolderNode({ node, depth }: { node: ArchitectureNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex items-center gap-1.5 py-0.5 w-full text-left hover:bg-white/5 rounded px-1"
          style={{ paddingLeft: depth * 16 + 4 }}
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 text-white/30 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <Folder className="h-3 w-3 text-white/40 shrink-0" />
          <span className="text-white/80">{node.name}</span>
          {node.displayName && node.displayName !== node.name && (
            <span className="text-white/30 ml-1">{node.displayName}</span>
          )}
          <span className="text-white/20 ml-auto mr-1">
            {node.metadata.totalFiles}f {node.metadata.totalLoc}L
          </span>
          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${CONTEXT_LABELS[node.executionContext].color}`}>
            {CONTEXT_LABELS[node.executionContext].label}
          </Badge>
          {node.metadata.clientFileCount > 0 && (
            <span className="text-emerald-400/50 text-[9px]">{node.metadata.clientFileCount}c</span>
          )}
          {node.metadata.serverFileCount > 0 && (
            <span className="text-blue-400/50 text-[9px]">{node.metadata.serverFileCount}s</span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {node.children.map((child) => (
          <FolderNode key={child.id} node={child} depth={depth + 1} />
        ))}
        {node.files.map((file) => (
          <FileNode key={file.path} file={file} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FileNode({ file, depth }: { file: FileInfo; depth: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 py-0.5 w-full text-left hover:bg-white/5 rounded px-1"
        style={{ paddingLeft: depth * 16 + 24 }}
      >
        <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_COLORS[file.type]}`} />
        <FileCode className="h-3 w-3 text-white/20 shrink-0" />
        <span className="text-white/60">{file.name}</span>
        {file.displayName && file.displayName !== file.name.replace(/\.(tsx?|jsx?)$/, '') && (
          <span className="text-white/30 ml-1">{file.displayName}</span>
        )}
        <span className="ml-auto text-white/20 flex items-center gap-2">
          {file.imports.length > 0 && <span>{file.imports.length} imp</span>}
          {file.exports.length > 0 && <span>{file.exports.length} exp</span>}
          <span>{file.loc}L</span>
        </span>
        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${CONTEXT_LABELS[file.executionContext].color}`}>
          {file.type}
        </Badge>
      </button>

      {expanded && (
        <div
          className="border-l border-white/5 ml-2 pl-2 py-1 space-y-1"
          style={{ marginLeft: depth * 16 + 28 }}
        >
          {file.imports.length > 0 && (
            <div>
              <div className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Imports</div>
              {file.imports.map((imp, i) => (
                <div key={i} className="text-white/40 pl-2">
                  <span className="text-white/20">{imp.source}</span>
                  <span className="text-white/10"> → </span>
                  <span className="text-white/50">{imp.resolvedPath}</span>
                  {imp.specifiers.length > 0 && (
                    <span className="text-white/20"> [{imp.specifiers.join(', ')}]</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {file.exports.length > 0 && (
            <div>
              <div className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Exports</div>
              <div className="text-white/40 pl-2">{file.exports.join(', ')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

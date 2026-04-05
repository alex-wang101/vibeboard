'use client';

import { useMemo } from 'react';
import type { ArchitectureGraph, ArchitectureNode, NodeType, ExecutionContext } from '@vibeboard/shared';

export function DebugStats({ graph }: { graph: ArchitectureGraph }) {
  const stats = useMemo(() => computeStats(graph), [graph]);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Overview */}
      <Section title="Overview">
        <Row label="Total files" value={stats.totalFiles} />
        <Row label="Total folders" value={stats.totalFolders} />
        <Row label="Total LOC" value={stats.totalLoc.toLocaleString()} />
        <Row label="Internal imports resolved" value={stats.totalImports} />
        <Row label="Imports skipped" value={`${stats.totalSkipped} (${stats.skipPercentage}%)`} />
      </Section>

      {/* By type */}
      <Section title="Files by type">
        {Object.entries(stats.byType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => (
            <Row key={type} label={type} value={count} />
          ))}
      </Section>

      {/* By context */}
      <Section title="Files by execution context">
        {Object.entries(stats.byContext)
          .sort(([, a], [, b]) => b - a)
          .map(([ctx, count]) => (
            <Row key={ctx} label={ctx} value={count} />
          ))}
      </Section>

      {/* Most imported */}
      <Section title="Top 10 most-imported files">
        {stats.mostImported.length === 0 ? (
          <div className="text-white/20 py-1">No import data</div>
        ) : (
          stats.mostImported.map(({ file, count }) => (
            <Row key={file} label={file} value={`${count} importers`} />
          ))
        )}
      </Section>

      {/* Most importing */}
      <Section title="Top 10 most-importing files">
        {stats.mostImporting.length === 0 ? (
          <div className="text-white/20 py-1">No import data</div>
        ) : (
          stats.mostImporting.map(({ file, count }) => (
            <Row key={file} label={file} value={`${count} imports`} />
          ))
        )}
      </Section>

      {/* Skipped imports */}
      <Section title={`Skipped imports (${stats.totalSkipped})`}>
        {graph.skippedImports.length === 0 ? (
          <div className="text-white/20 py-1">All imports resolved</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-0.5">
            {graph.skippedImports.map((s, i) => (
              <div key={i} className="flex gap-2 text-white/30">
                <span className="text-white/40 shrink-0 min-w-0 truncate max-w-[50%]">{s.sourceFile}</span>
                <span className="text-white/10">→</span>
                <span className="text-white/20 truncate">{s.importPath}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-white/50 text-sm font-sans mb-2">{title}</div>
      <div className="border border-white/5 rounded bg-white/[0.02] p-3 space-y-1">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-white/40 truncate mr-4">{label}</span>
      <span className="text-white/70 shrink-0">{value}</span>
    </div>
  );
}

interface Stats {
  totalFiles: number;
  totalFolders: number;
  totalLoc: number;
  totalImports: number;
  totalSkipped: number;
  skipPercentage: string;
  byType: Record<string, number>;
  byContext: Record<string, number>;
  mostImported: { file: string; count: number }[];
  mostImporting: { file: string; count: number }[];
}

function computeStats(graph: ArchitectureGraph): Stats {
  const byType: Record<string, number> = {};
  const byContext: Record<string, number> = {};
  const importedBy = new Map<string, number>(); // file → how many files import it
  const importCount = new Map<string, number>(); // file → how many imports it has
  let totalFiles = 0;
  let totalFolders = 0;
  let totalLoc = 0;
  let totalImports = 0;

  function walk(node: ArchitectureNode) {
    totalFolders++;
    for (const file of node.files) {
      totalFiles++;
      totalLoc += file.loc;
      byType[file.type] = (byType[file.type] || 0) + 1;
      byContext[file.executionContext] = (byContext[file.executionContext] || 0) + 1;

      // Import stats
      totalImports += file.imports.length;
      importCount.set(file.path, file.imports.length);
      for (const imp of file.imports) {
        importedBy.set(imp.resolvedPath, (importedBy.get(imp.resolvedPath) || 0) + 1);
      }
    }
    for (const child of node.children) {
      walk(child);
    }
  }
  walk(graph.root);

  const totalSkipped = graph.skippedImports.length;
  const totalAll = totalImports + totalSkipped;
  const skipPercentage = totalAll > 0 ? ((totalSkipped / totalAll) * 100).toFixed(1) : '0';

  const mostImported = [...importedBy.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  const mostImporting = [...importCount.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  return {
    totalFiles,
    totalFolders,
    totalLoc,
    totalImports,
    totalSkipped,
    skipPercentage,
    byType,
    byContext,
    mostImported,
    mostImporting,
  };
}

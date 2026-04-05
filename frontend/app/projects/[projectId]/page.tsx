'use client';

import { useEffect, useState, use } from 'react';
import { getArchitecture, getProject } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { DebugTree } from '@/components/debug/debug-tree';
import { DebugEdges } from '@/components/debug/debug-edges';
import { DebugStats } from '@/components/debug/debug-stats';
import type { ArchitectureGraph, Project } from '@vibeboard/shared';

export default function ProjectCanvasPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([getArchitecture(projectId), getProject(projectId)])
      .then(([arch, proj]) => {
        setGraph(arch);
        setProject(proj);
      })
      .catch((err) => setError(err.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Spinner className="h-6 w-6 text-white/40" />
      </div>
    );
  }

  if (error || !graph) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black gap-4">
        <p className="text-red-400 text-sm font-mono">{error ?? 'No architecture data found'}</p>
        <p className="text-white/30 text-xs">
          Try scanning the repository from the project creation page.
        </p>
      </div>
    );
  }

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(graph, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-lg font-bold">
            {project?.name ?? 'Project'} — Debug Panel
          </h1>
          <p className="text-white/30 text-xs font-mono">
            {graph.repoUrl} @ {graph.branch}
          </p>
        </div>
        <div className="text-white/20 text-xs font-mono">
          {graph.root.metadata.totalFiles} files | {graph.root.metadata.totalLoc.toLocaleString()} LOC
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4">
        <Tabs defaultValue="tree">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="tree" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
              Tree
            </TabsTrigger>
            <TabsTrigger value="edges" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
              Edges
            </TabsTrigger>
            <TabsTrigger value="json" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
              Raw JSON
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tree" className="mt-4">
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <DebugTree root={graph.root} />
            </div>
          </TabsContent>

          <TabsContent value="edges" className="mt-4">
            <DebugEdges graph={graph} />
          </TabsContent>

          <TabsContent value="json" className="mt-4">
            <div className="flex justify-end mb-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="text-xs border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              >
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
            </div>
            <pre className="max-h-[calc(100vh-220px)] overflow-auto rounded-lg border border-white/10 bg-white/[0.02] p-4 text-[11px] text-white/50 font-mono whitespace-pre">
              {JSON.stringify(graph, null, 2)}
            </pre>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <DebugStats graph={graph} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

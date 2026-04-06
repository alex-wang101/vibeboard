'use client';

import { useEffect, useState, use } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { getArchitecture, getProject } from '@/lib/api';
import { useCanvasStore } from '@/stores/canvas-store';
import { ArchitectureCanvas } from '@/components/canvas/architecture-canvas';
import { BreadcrumbNav } from '@/components/canvas/breadcrumb-nav';
import { DetailPanel } from '@/components/canvas/detail-panel';
import { NodePalette } from '@/components/canvas/node-palette';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DebugTree } from '@/components/debug/debug-tree';
import { DebugEdges } from '@/components/debug/debug-edges';
import { DebugStats } from '@/components/debug/debug-stats';
import { Bug } from 'lucide-react';
import type { ArchitectureGraph } from '@vibeboard/shared';
import '@/app/reactflow-overrides.css';

export default function ProjectCanvasPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);

  const loadArchitecture = useCanvasStore((s) => s.loadArchitecture);
  const setProject = useCanvasStore((s) => s.setProject);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const project = useCanvasStore((s) => s.project);

  useEffect(() => {
    Promise.all([getArchitecture(projectId), getProject(projectId)])
      .then(([arch, proj]) => {
        setGraph(arch);
        setProject(proj);
        if (arch) loadArchitecture(arch);
      })
      .catch((err) => setError(err.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [projectId, loadArchitecture, setProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <Spinner className="h-6 w-6 text-white/40" />
      </div>
    );
  }

  if (error || !graph) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0f] gap-4">
        <p className="text-red-400 text-sm font-mono">{error ?? 'No architecture data'}</p>
        <p className="text-white/30 text-xs">Scan the repository first.</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-[#0a0a0f] text-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm font-medium">
              {project?.name ?? 'Project'}
            </span>
            {project?.repoUrl && (
              <span className="text-white/20 text-xs font-mono">
                {project.repoUrl.replace('https://github.com/', '')}
              </span>
            )}
          </div>

          {/* Debug toggle */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/30 hover:text-white/60 hover:bg-white/5 gap-1.5"
              >
                <Bug className="h-3.5 w-3.5" />
                <span className="text-xs">Debug</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="bg-[#0a0a0f] border-white/10 text-white h-[60vh]"
            >
              <Tabs defaultValue="tree" className="h-full flex flex-col">
                <TabsList className="bg-white/5 border border-white/10 shrink-0">
                  <TabsTrigger value="tree" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">Tree</TabsTrigger>
                  <TabsTrigger value="edges" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">Edges</TabsTrigger>
                  <TabsTrigger value="json" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">Raw JSON</TabsTrigger>
                  <TabsTrigger value="stats" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">Stats</TabsTrigger>
                </TabsList>
                <TabsContent value="tree" className="flex-1 overflow-auto mt-2">
                  <DebugTree root={graph.root} />
                </TabsContent>
                <TabsContent value="edges" className="flex-1 overflow-auto mt-2">
                  <DebugEdges graph={graph} />
                </TabsContent>
                <TabsContent value="json" className="flex-1 overflow-auto mt-2">
                  <pre className="text-[11px] text-white/50 font-mono whitespace-pre">
                    {JSON.stringify(graph, null, 2)}
                  </pre>
                </TabsContent>
                <TabsContent value="stats" className="flex-1 overflow-auto mt-2">
                  <DebugStats graph={graph} />
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>
        </div>

        {/* Breadcrumb */}
        <BreadcrumbNav />

        {/* Main area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: palette */}
          <NodePalette />

          {/* Center: canvas */}
          <div className="flex-1">
            <ArchitectureCanvas />
          </div>

          {/* Right: detail panel (conditional) */}
          {selectedNodeId && <DetailPanel />}
        </div>
      </div>
    </ReactFlowProvider>
  );
}

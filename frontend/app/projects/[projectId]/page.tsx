// TODO: Main canvas view for a project — the core of the app
// - Loads the project's ArchitectureGraph from the backend
// - Renders ArchitectureCanvas (React Flow) with the graph
// - Shows NodePalette sidebar for "design from scratch" mode
// - Shows DetailPanel sidebar when a node is selected
// - Shows BreadcrumbNav for drill-down navigation
// - Shows AppHeader with project name and actions
//
// This page replaces the old WorkflowBuilder for architecture visualization.
// The WorkflowBuilder component at components/workflow-builder.tsx can be
// referenced for patterns on how to set up React Flow here.
export default function ProjectCanvasPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return (
    <div className="flex flex-col h-screen">
      {/* TODO: AppHeader component */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <span className="font-semibold">Project Canvas</span>
        <span className="text-sm text-muted-foreground">
          {/* TODO: Display project name */}
          Loading...
        </span>
      </header>
      {/* TODO: Replace with ArchitectureCanvas + sidebars */}
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Canvas will render here — see components/canvas/
      </div>
    </div>
  );
}

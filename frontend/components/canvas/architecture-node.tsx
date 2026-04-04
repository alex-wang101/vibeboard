'use client';

// TODO: Custom React Flow node for rendering architecture nodes
// - Displays node icon based on NodeType (page, component, api-route, etc.)
// - Shows execution context badge (client/server/api/edge)
// - Color-coded borders by execution context
// - Shows metadata: file count, LOC
// - Double-click to drill down into folder/group nodes
// - Visual indicator for manually-created vs scanned nodes
// - Handles for connecting edges (source/target)
//
// Reference: components/nodes/ for existing custom node patterns
export function ArchitectureNodeComponent() {
  return (
    <div className="border rounded-lg p-3 bg-background shadow-sm">
      <p className="text-xs text-muted-foreground">Architecture Node</p>
    </div>
  );
}

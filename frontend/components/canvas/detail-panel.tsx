'use client';

// TODO: Detail Panel - right sidebar showing selected node details
// - Appears when a node is selected on the canvas
// - Shows node name, type, execution context
// - For scanned nodes: file list, imports/exports, LOC
// - For manual nodes: editable description, tags
// - AI explanation of the node's role (future feature)
// - Data flow visualization: what imports this node, what it exports to
//
// Reference: components/node-config-panel.tsx for panel patterns
export function DetailPanel() {
  return (
    <div className="w-80 border-l p-4 bg-background">
      <h2 className="font-semibold text-sm mb-4">Details</h2>
      <p className="text-xs text-muted-foreground">
        Select a node to view its details.
      </p>
    </div>
  );
}

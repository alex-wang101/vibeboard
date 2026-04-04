'use client';

// TODO: Architecture Canvas — wraps React Flow
// - Renders the current level's nodes and edges from the canvas store
// - Supports drill-down: double-click a folder/group node to navigate into it
// - Handles drag-and-drop from NodePalette for "design from scratch" mode
// - Registers custom node types (ArchitectureNode)
// - Registers custom edge types
// - Provides canvas controls (zoom, fit view, minimap)
//
// Reference: components/workflow-builder.tsx for React Flow setup patterns
export function ArchitectureCanvas() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/30">
      <p className="text-muted-foreground text-sm">
        Architecture canvas — React Flow will render here
      </p>
    </div>
  );
}

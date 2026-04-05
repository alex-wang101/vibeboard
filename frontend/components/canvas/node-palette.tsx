'use client';

// TODO: Node Palette - sidebar for "design from scratch" mode
// - Lists available node types from NEXTJS_PALETTE (from @vibeboard/shared)
// - Grouped by category: nextjs, backend, data, external
// - Each item is draggable onto the canvas
// - Shows icon, label, and description
// - Search/filter functionality
//
// Reference: components/node-library.tsx for drag-and-drop patterns
export function NodePalette() {
  return (
    <div className="w-64 border-r p-4 bg-background">
      <h2 className="font-semibold text-sm mb-4">Components</h2>
      <p className="text-xs text-muted-foreground">
        Drag components onto the canvas to design your architecture.
      </p>
      {/* TODO: Render NEXTJS_PALETTE items as draggable cards */}
    </div>
  );
}

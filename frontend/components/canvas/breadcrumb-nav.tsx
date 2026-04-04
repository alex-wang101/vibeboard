'use client';

// TODO: Breadcrumb Navigation — for drill-down hierarchy
// - Shows the current path in the architecture tree
// - Each segment is clickable to navigate back to that level
// - "Root" → "app" → "dashboard" → "components"
// - Uses the canvas store's currentPath and navigationHistory
// - Back button to navigate up one level
export function BreadcrumbNav() {
  return (
    <nav className="flex items-center gap-1 px-4 py-2 text-sm border-b bg-background">
      <span className="text-muted-foreground">Root</span>
      {/* TODO: Render breadcrumb segments from canvas store currentPath */}
    </nav>
  );
}

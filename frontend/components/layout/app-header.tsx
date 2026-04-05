'use client';

// TODO: App Header - top navigation bar
// - VibeBoard logo/name (links to /projects)
// - Current project name (when on canvas page)
// - User avatar + dropdown (sign out, settings)
// - Navigation links (projects, docs)
export function AppHeader() {
  return (
    <header className="border-b px-4 py-2 flex items-center justify-between bg-background">
      <span className="font-bold text-lg">VibeBoard</span>
      <div className="flex items-center gap-4">
        {/* TODO: User menu with session info from next-auth */}
        <span className="text-sm text-muted-foreground">User</span>
      </div>
    </header>
  );
}

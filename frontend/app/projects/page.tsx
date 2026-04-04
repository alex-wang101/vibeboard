// TODO: Projects list page
// - Fetch user's projects from the backend via lib/api.ts
// - Display as a grid of ProjectCard components
// - "New Project" button → navigates to /projects/new
// - Empty state for users with no projects yet
// - Protected route — redirect to /auth/login if unauthenticated
export default function ProjectsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">My Projects</h1>
          {/* TODO: Link to /projects/new */}
          <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            New Project
          </button>
        </div>
        <p className="text-muted-foreground">
          No projects yet. Create a new project to get started.
        </p>
      </div>
    </div>
  );
}

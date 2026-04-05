// TODO: Project Card - displayed in the projects list grid
// - Shows project name, source (scratch/github), last modified date
// - GitHub repo badge if imported
// - Click to navigate to /projects/[projectId] (canvas view)
// - Delete action (with confirmation)
// - Visual indicator for scan status
import type { Project } from '@vibeboard/shared';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
      <h3 className="font-semibold">{project.name}</h3>
      <p className="text-xs text-muted-foreground mt-1">
        {project.source === 'github' ? `GitHub: ${project.repoUrl}` : 'Designed from scratch'}
      </p>
    </div>
  );
}

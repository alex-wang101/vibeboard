'use client';

// TODO: Repo Picker — GitHub repo and branch selection UI
// - Fetches user's repos from backend /github/repos endpoint
// - Search/filter repos by name
// - Shows repo name, visibility (public/private), description
// - After selecting a repo, shows branch dropdown (fetched from /github/repos/:owner/:repo/branches)
// - "Import" button to trigger scan and create project
// - Loading states for repo list and branch list
export function RepoPicker() {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Select a repository</h2>
      <p className="text-sm text-muted-foreground">
        Choose a GitHub repository to import and visualize.
      </p>
      {/* TODO: Repo list with search, branch selector, import button */}
    </div>
  );
}

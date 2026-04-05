'use client';

import { useEffect, useState } from 'react';
import { listGitHubRepos, listBranches } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Lock, Globe, GitBranch, ArrowLeft } from 'lucide-react';
import type { GitHubRepo } from '@vibeboard/shared';

interface RepoPickerProps {
  onImport: (repoUrl: string, branch: string, repoName: string) => void;
  onCancel: () => void;
}

export function RepoPicker({ onImport, onCancel }: RepoPickerProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    listGitHubRepos()
      .then(setRepos)
      .catch(() => setError('Failed to load repositories'))
      .finally(() => setLoading(false));
  }, []);

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelectRepo(repo: GitHubRepo) {
    setSelectedRepo(repo);
    setSelectedBranch(repo.defaultBranch);
    setBranchesLoading(true);

    try {
      const [owner, name] = repo.fullName.split('/');
      const branchList = await listBranches(owner, name);
      setBranches(branchList);
    } catch {
      setBranches([repo.defaultBranch]);
    } finally {
      setBranchesLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm tracking-widest uppercase"
      >
        <ArrowLeft className="h-4 w-4" />
        back
      </button>

      <div>
        <h2 className="font-serif text-3xl font-bold text-white">
          Select a repository
        </h2>
        <p className="mt-2 text-white/60 text-sm">
          Choose a GitHub repository to import and visualize.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
        />
      </div>

      {/* Repo list */}
      <ScrollArea className="h-[320px] rounded-lg border border-white/10 bg-white/[0.03]">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-white/10" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-white/40 text-sm">No repositories found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredRepos.map((repo) => (
              <button
                key={repo.fullName}
                onClick={() => handleSelectRepo(repo)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/5 ${
                  selectedRepo?.fullName === repo.fullName
                    ? 'bg-white/10'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm truncate">
                    {repo.fullName}
                  </span>
                  {repo.private ? (
                    <Badge
                      variant="outline"
                      className="border-yellow-500/30 text-yellow-400 text-[10px] px-1.5 py-0"
                    >
                      <Lock className="h-2.5 w-2.5 mr-0.5" />
                      private
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-green-500/30 text-green-400 text-[10px] px-1.5 py-0"
                    >
                      <Globe className="h-2.5 w-2.5 mr-0.5" />
                      public
                    </Badge>
                  )}
                </div>
                {repo.description && (
                  <p className="text-white/40 text-xs mt-1 truncate">
                    {repo.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Branch selector */}
      {selectedRepo && (
        <div className="space-y-2">
          <label className="text-white/60 text-xs tracking-widest uppercase flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Branch
          </label>
          {branchesLoading ? (
            <Skeleton className="h-10 w-full bg-white/10" />
          ) : (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Action */}
      {selectedRepo && (
        <div className="flex justify-end">
          <Button
            onClick={() =>
              onImport(selectedRepo.url, selectedBranch, selectedRepo.name)
            }
            disabled={!selectedBranch}
            className="bg-white text-black hover:bg-white/90"
          >
            Import &amp; Scan
          </Button>
        </div>
      )}
    </div>
  );
}

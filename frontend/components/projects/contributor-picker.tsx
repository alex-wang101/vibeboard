'use client';

import { useEffect, useState } from 'react';
import { listContributors } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Plus, UserPlus } from 'lucide-react';
import type { GitHubContributor, ProjectContributor } from '@vibeboard/shared';

interface ContributorPickerProps {
  repoFullName: string | null;
  contributors: ProjectContributor[];
  onChange: (contributors: ProjectContributor[]) => void;
}

export function ContributorPicker({
  repoFullName,
  contributors,
  onChange,
}: ContributorPickerProps) {
  const [suggestions, setSuggestions] = useState<GitHubContributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  useEffect(() => {
    if (!repoFullName) return;
    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) return;

    setLoading(true);
    listContributors(owner, repo)
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [repoFullName]);

  function addContributor(name: string, email: string) {
    if (!email) return;
    if (contributors.some((c) => c.email === email)) return;
    onChange([...contributors, { name, email }]);
  }

  function removeContributor(email: string) {
    onChange(contributors.filter((c) => c.email !== email));
  }

  function handleManualAdd() {
    if (!manualName.trim() || !manualEmail.trim()) return;
    addContributor(manualName.trim(), manualEmail.trim());
    setManualName('');
    setManualEmail('');
  }

  // Filter out suggestions that are already added
  const availableSuggestions = suggestions.filter(
    (s) => !contributors.some((c) => c.email === s.email)
  );

  return (
    <div className="space-y-6">
      {/* GitHub suggestions */}
      {repoFullName && (
        <div>
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3">
            Suggestions from GitHub
          </p>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-40 bg-white/10 rounded-full" />
              ))}
            </div>
          ) : availableSuggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.map((s) => (
                <button
                  key={s.login}
                  onClick={() => {
                    if (s.email) {
                      addContributor(s.name ?? s.login, s.email);
                    }
                  }}
                  disabled={!s.email}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    s.email
                      ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      : 'border-white/5 bg-white/[0.02] text-white/30 cursor-not-allowed'
                  }`}
                >
                  <img
                    src={s.avatarUrl}
                    alt={s.login}
                    className="h-5 w-5 rounded-full"
                  />
                  <span>{s.name ?? s.login}</span>
                  {s.email ? (
                    <Plus className="h-3 w-3 text-white/30" />
                  ) : (
                    <span className="text-[10px] text-white/20">no email</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-white/20 text-sm">
              {suggestions.length > 0
                ? 'All contributors added'
                : 'No contributors found'}
            </p>
          )}
        </div>
      )}

      {/* Added contributors */}
      {contributors.length > 0 && (
        <div>
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3">
            Team ({contributors.length})
          </p>
          <div className="space-y-2">
            {contributors.map((c) => (
              <div
                key={c.email}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2"
              >
                <div>
                  <span className="text-white/80 text-sm">{c.name}</span>
                  <span className="text-white/30 text-sm ml-2">{c.email}</span>
                </div>
                <button
                  onClick={() => removeContributor(c.email)}
                  className="text-white/20 hover:text-white/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual add */}
      <div>
        <p className="text-white/40 text-xs tracking-widest uppercase mb-3">
          <UserPlus className="h-3 w-3 inline mr-1" />
          Add manually
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
          />
          <Input
            placeholder="Email"
            type="email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
          />
          <Button
            onClick={handleManualAdd}
            disabled={!manualName.trim() || !manualEmail.trim()}
            variant="outline"
            size="sm"
            className="border-white/10 text-white/60 hover:text-white hover:bg-white/10 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

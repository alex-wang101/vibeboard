'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject, scanRepo } from '@/lib/api';
import { RepoPicker } from '@/components/projects/repo-picker';
import { ContributorPicker } from '@/components/projects/contributor-picker';
import { ArchitectureTreeWidget } from '@/components/projects/architecture-tree-widget';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, ArrowRight, Github, PenLine } from 'lucide-react';
import type { ArchitectureGraph, ProjectContributor } from '@vibeboard/shared';

type Step = 'setup' | 'team' | 'scanning' | 'done';

export default function NewProjectPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>('setup');

  // Setup state
  const [projectName, setProjectName] = useState('');
  const [source, setSource] = useState<'github' | 'scratch' | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<{
    url: string;
    branch: string;
    name: string;
    fullName: string;
  } | null>(null);

  // Team state
  const [contributors, setContributors] = useState<ProjectContributor[]>([]);

  // Scan state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canProceedSetup =
    projectName.trim() &&
    source &&
    (source === 'scratch' || (source === 'github' && selectedRepo));

  function handleRepoImport(repoUrl: string, branch: string, repoName: string) {
    setSelectedRepo({
      url: repoUrl,
      branch,
      name: repoName,
      fullName: repoName, // RepoPicker passes fullName as repoName
    });
    if (!projectName.trim()) {
      setProjectName(repoName);
    }
  }

  async function handleCreate() {
    setError(null);

    try {
      const project = await createProject({
        name: projectName.trim(),
        source: source!,
        repoUrl: selectedRepo?.url,
        branch: selectedRepo?.branch,
        contributors,
      });
      setProjectId(project.id);

      if (source === 'github' && selectedRepo) {
        setStep('scanning');
        const result = await scanRepo({
          projectId: project.id,
          repoUrl: selectedRepo.url,
          branch: selectedRepo.branch,
        });

        if (result.status === 'error') {
          setError(result.error ?? 'Scan failed');
          setStep('team');
          return;
        }

        setGraph(result.architecture ?? null);
        setStep('done');
      } else {
        router.push(`/projects/${project.id}`);
      }
    } catch {
      setError('Something went wrong');
      setStep('team');
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          backgroundImage: "url('/background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-10 sm:px-16 md:px-24 py-20">
        {/* Step 1: Setup */}
        {step === 'setup' && (
          <div className="w-full max-w-2xl opacity-0 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-white text-center mb-2">
              Create a new project
            </h1>
            <p className="text-white/50 text-sm text-center mb-8">
              Give your project a name and choose how to get started.
            </p>

            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
              {/* Project name */}
              <div className="mb-8">
                <label className="text-white/40 text-xs tracking-widest uppercase block mb-2">
                  Project name
                </label>
                <Input
                  placeholder="My project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 text-lg h-12 focus-visible:ring-white/20"
                />
              </div>

              {/* Source toggle */}
              <div className="mb-8">
                <label className="text-white/40 text-xs tracking-widest uppercase block mb-3">
                  Source
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setSource('github');
                      setSelectedRepo(null);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-5 transition-all ${
                      source === 'github'
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/60'
                    }`}
                  >
                    <Github className="h-6 w-6" />
                    <span className="text-sm font-medium">Import from GitHub</span>
                    <span className="text-[11px] text-white/30">
                      Clone and scan a repository
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setSource('scratch');
                      setSelectedRepo(null);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-5 transition-all ${
                      source === 'scratch'
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/60'
                    }`}
                  >
                    <PenLine className="h-6 w-6" />
                    <span className="text-sm font-medium">Start from scratch</span>
                    <span className="text-[11px] text-white/30">
                      Design on a blank canvas
                    </span>
                  </button>
                </div>
              </div>

              {/* Repo picker (inline when GitHub selected) */}
              {source === 'github' && !selectedRepo && (
                <div className="mb-8">
                  <RepoPicker
                    onImport={handleRepoImport}
                    onCancel={() => setSource(null)}
                  />
                </div>
              )}

              {/* Selected repo summary */}
              {source === 'github' && selectedRepo && (
                <div className="mb-8 rounded-lg border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-white/80 text-sm font-medium">
                      {selectedRepo.fullName}
                    </span>
                    <span className="text-white/30 text-sm ml-2">
                      @ {selectedRepo.branch}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedRepo(null)}
                    className="text-white/30 hover:text-white/60 text-xs tracking-widest uppercase transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Next button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => setStep('team')}
                  disabled={!canProceedSetup}
                  className="bg-white text-black hover:bg-white/90 gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Team */}
        {step === 'team' && (
          <div className="w-full max-w-2xl opacity-0 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => setStep('setup')}
              className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <h2 className="font-serif text-3xl font-bold text-white text-center mb-2">
              Add your team
            </h2>
            <p className="text-white/50 text-sm text-center mb-8">
              Invite contributors to collaborate on this project. You can always add more later.
            </p>

            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
              {error && (
                <p className="mb-4 text-red-400 text-sm text-center">{error}</p>
              )}

              <ContributorPicker
                repoFullName={
                  source === 'github' && selectedRepo
                    ? selectedRepo.fullName
                    : null
                }
                contributors={contributors}
                onChange={setContributors}
              />

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={handleCreate}
                  className="text-white/30 hover:text-white/60 transition-colors text-sm"
                >
                  Skip
                </button>
                <Button
                  onClick={handleCreate}
                  className="bg-white text-black hover:bg-white/90"
                >
                  Create Project
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Scanning */}
        {step === 'scanning' && (
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-12 shadow-2xl opacity-0 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col items-center justify-center gap-4">
              <Spinner className="h-8 w-8 text-white/60" />
              <p className="text-white/60 text-sm tracking-widest uppercase">
                Cloning and scanning repository...
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && graph && (
          <div className="max-w-2xl w-full opacity-0 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="font-serif text-3xl font-bold text-white mb-2 text-center">
              Scan complete
            </h2>
            <p className="text-white/60 text-sm mb-6 text-center">
              Here&apos;s what we found in your repository.
            </p>

            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
              <ArchitectureTreeWidget graph={graph} />

              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="bg-white text-black hover:bg-white/90"
                >
                  Open Project
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject, scanRepo } from '@/lib/api';
import { RepoPicker } from '@/components/projects/repo-picker';
import { ArchitectureTreeWidget } from '@/components/projects/architecture-tree-widget';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import type { ArchitectureGraph } from '@vibeboard/shared';

type Step = 'choose' | 'repo-picker' | 'scanning' | 'done';

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScratch() {
    try {
      const project = await createProject({ name: 'Untitled', source: 'scratch' });
      router.push(`/projects/${project.id}`);
    } catch {
      setError('Failed to create project');
    }
  }

  async function handleImport(repoUrl: string, branch: string, repoName: string) {
    setStep('scanning');
    setError(null);

    try {
      const project = await createProject({
        name: repoName,
        source: 'github',
        repoUrl,
        branch,
      });
      setProjectId(project.id);

      const result = await scanRepo({
        projectId: project.id,
        repoUrl,
        branch,
      });

      if (result.status === 'error') {
        setError(result.error ?? 'Scan failed');
        setStep('repo-picker');
        return;
      }

      setGraph(result.architecture ?? null);
      setStep('done');
    } catch {
      setError('Something went wrong');
      setStep('repo-picker');
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

      <div className="relative z-10 flex min-h-screen flex-col justify-end px-10 pb-20 sm:px-16 md:px-24">
        {step === 'choose' && (
          <>
            <h1
              className="font-serif text-5xl sm:text-6xl font-bold tracking-tight text-white opacity-0 animate-fade-up"
              style={{ animationDelay: '0.2s' }}
            >
              New project
            </h1>

            <p
              className="mt-6 max-w-lg text-lg leading-relaxed text-white/80 opacity-0 animate-fade-up"
              style={{ animationDelay: '0.5s' }}
            >
              Design your system architecture on a blank canvas, or connect a
              repository and we&apos;ll generate an interactive diagram you can
              explore and extend.
            </p>

            {error && (
              <p className="mt-4 text-red-400 text-sm">{error}</p>
            )}

            <div
              className="mt-10 flex items-center gap-6 opacity-0 animate-fade-up"
              style={{ animationDelay: '0.8s' }}
            >
              <button
                onClick={handleScratch}
                className="text-white/90 hover:text-white transition-colors text-sm tracking-widest uppercase"
              >
                [start from scratch]
              </button>
              <button
                onClick={() => setStep('repo-picker')}
                className="text-white/50 hover:text-white/80 transition-colors text-sm tracking-widest uppercase"
              >
                [import from github]
              </button>
            </div>
          </>
        )}

        {step === 'repo-picker' && (
          <div className="max-w-xl opacity-0 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {error && (
              <p className="mb-4 text-red-400 text-sm">{error}</p>
            )}
            <RepoPicker
              onImport={handleImport}
              onCancel={() => {
                setStep('choose');
                setError(null);
              }}
            />
          </div>
        )}

        {step === 'scanning' && (
          <div className="flex flex-col items-center justify-center gap-4 opacity-0 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <Spinner className="h-8 w-8 text-white/60" />
            <p className="text-white/60 text-sm tracking-widest uppercase">
              Cloning and scanning repository...
            </p>
          </div>
        )}

        {step === 'done' && graph && (
          <div className="max-w-2xl opacity-0 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="font-serif text-3xl font-bold text-white mb-2">
              Scan complete
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Here&apos;s what we found in your repository.
            </p>

            <ArchitectureTreeWidget graph={graph} />

            <div className="mt-8 flex justify-end">
              <Button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="bg-white text-black hover:bg-white/90"
              >
                Continue to Canvas
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

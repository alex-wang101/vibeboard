'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProjects, deleteProject, updateProject } from '@/lib/api';
import { ContributorPicker } from '@/components/projects/contributor-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { MoreHorizontal, Pencil, Trash2, UserPlus } from 'lucide-react';
import type { Project, ProjectContributor } from '@vibeboard/shared';

export default function ProjectsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Menu state
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Rename dialog
  const [renameProject, setRenameProject] = useState<Project | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Contributors dialog
  const [contribProject, setContribProject] = useState<Project | null>(null);
  const [contribList, setContribList] = useState<ProjectContributor[]>([]);
  const [contribLoading, setContribLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    getProjects()
      .then(setProjects)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleRename() {
    if (!renameProject || !renameName.trim()) return;
    setRenameLoading(true);
    try {
      const updated = await updateProject(renameProject.id, { name: renameName.trim() });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setRenameProject(null);
    } catch {
      setError('Failed to rename project');
    } finally {
      setRenameLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteProject(deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Failed to delete project');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleContribSave() {
    if (!contribProject) return;
    setContribLoading(true);
    try {
      const updated = await updateProject(contribProject.id, { contributors: contribList });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setContribProject(null);
    } catch {
      setError('Failed to update contributors');
    } finally {
      setContribLoading(false);
    }
  }

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
        <div className="animate-spin h-6 w-6 border-2 border-white/30 border-t-white rounded-full" />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between mb-10">
          <h1 className="font-serif text-3xl font-bold tracking-tight">My Projects</h1>
          <Link
            href="/projects/new"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
          >
            New Project
          </Link>
        </div>

        {error && (
          <div className="mb-8 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-white/40 text-lg mb-6">No projects yet</p>
            <Link
              href="/projects/new"
              className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 transition-colors"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] transition-all"
              >
                {/* Card content — clickable */}
                <Link href={`/projects/${project.id}`} className="block p-5">
                  <h2 className="font-semibold text-white group-hover:text-white/90 mb-1 truncate pr-8">
                    {project.name}
                  </h2>
                  <p className="text-xs text-white/30 mb-3">
                    {project.source === 'github' ? 'GitHub import' : 'From scratch'}
                  </p>
                  {project.repoUrl && (
                    <p className="text-xs text-white/20 truncate font-mono mb-3">
                      {project.repoUrl.replace('https://github.com/', '')}
                    </p>
                  )}
                  {project.contributors && project.contributors.length > 0 && (
                    <p className="text-xs text-white/20 mb-3">
                      {project.contributors.length} contributor{project.contributors.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-white/20">
                    <span>
                      {project.lastScannedAt
                        ? `Scanned ${new Date(project.lastScannedAt).toLocaleDateString()}`
                        : 'Not scanned'}
                    </span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>

                {/* Menu button */}
                <div className="absolute top-4 right-4" ref={menuOpen === project.id ? menuRef : undefined}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(menuOpen === project.id ? null : project.id);
                    }}
                    className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/10 transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {menuOpen === project.id && (
                    <div className="absolute right-0 top-8 z-50 min-w-[160px] rounded-lg border border-white/10 bg-[#1a1a24] shadow-xl py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(null);
                          setRenameName(project.name);
                          setRenameProject(project);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(null);
                          setContribList(project.contributors ?? []);
                          setContribProject(project);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Contributors
                      </button>
                      <div className="border-t border-white/5 my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(null);
                          setDeleteTarget(project);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameProject} onOpenChange={() => setRenameProject(null)}>
        <DialogContent className="bg-[#1a1a24] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription className="text-white/40">
              Enter a new name for this project.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            autoFocus
            className="bg-white/5 border-white/10 text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameProject(null)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!renameName.trim() || renameLoading}
              className="bg-white text-black hover:bg-white/90"
            >
              {renameLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-[#1a1a24] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription className="text-white/40">
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteLoading}
              variant="destructive"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contributors dialog */}
      <Dialog open={!!contribProject} onOpenChange={() => setContribProject(null)}>
        <DialogContent className="bg-[#1a1a24] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage contributors</DialogTitle>
            <DialogDescription className="text-white/40">
              Add or remove contributors for &quot;{contribProject?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <ContributorPicker
            repoFullName={
              contribProject?.source === 'github' && contribProject?.repoUrl
                ? contribProject.repoUrl.replace('https://github.com/', '')
                : null
            }
            contributors={contribList}
            onChange={setContribList}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContribProject(null)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={handleContribSave}
              disabled={contribLoading}
              className="bg-white text-black hover:bg-white/90"
            >
              {contribLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import type { GitHubRepo } from '@vibeboard/shared';

const CLONE_DIR = path.resolve(process.env.CLONE_DIR || './tmp/repos');

export async function listUserRepos(token: string): Promise<GitHubRepo[]> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
    type: 'all',
  });

  return data.map((repo) => ({
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    defaultBranch: repo.default_branch ?? 'main',
    description: repo.description ?? null,
    url: repo.html_url,
  }));
}

export async function listBranches(
  owner: string,
  repo: string,
  token: string
): Promise<string[]> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.repos.listBranches({
    owner,
    repo,
    per_page: 100,
  });
  return data.map((b) => b.name);
}

export async function cloneRepository(
  repoUrl: string,
  branch: string,
  token: string,
  userId: string,
  projectId: string
): Promise<string> {
  // Parse owner/repo from URL like https://github.com/owner/repo
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');

  const authenticatedUrl = `https://x-access-token:${token}@github.com/${owner}/${cleanRepo}.git`;
  const clonePath = path.join(CLONE_DIR, userId, projectId);

  await fs.mkdir(clonePath, { recursive: true });

  const git = simpleGit();
  await git.clone(authenticatedUrl, clonePath, [
    '--depth', '1',
    '--branch', branch,
    '--single-branch',
  ]);

  return clonePath;
}

export async function cleanupClone(clonePath: string): Promise<void> {
  await fs.rm(clonePath, { recursive: true, force: true });
}

// TODO: GitHub service — clone repos and interact with GitHub API

export async function cloneRepository(
  _repoUrl: string,
  _branch: string,
  _token: string
): Promise<string> {
  // TODO: Use simple-git to clone the repo to a temp directory
  // - Construct authenticated URL: https://{token}@github.com/{owner}/{repo}.git
  // - Clone with depth=1 for speed (shallow clone)
  // - Checkout the specified branch
  // - Return the local path to the cloned repo
  // - Handle cleanup after scanning (delete temp dir)
  throw new Error('cloneRepository not implemented');
}

export async function listUserRepos(_token: string): Promise<unknown[]> {
  // TODO: Use Octokit with the user's token to list their repos
  // - Include both owned repos and repos they have access to
  // - Return name, fullName, private, defaultBranch, description
  throw new Error('listUserRepos not implemented');
}

export async function listBranches(
  _owner: string,
  _repo: string,
  _token: string
): Promise<string[]> {
  // TODO: Use Octokit to list branches for a specific repo
  throw new Error('listBranches not implemented');
}

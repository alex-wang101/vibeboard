import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { decryptToken } from '@vibeboard/shared';

declare global {
  namespace Express {
    interface Request {
      githubToken?: string;
      githubUser?: {
        id: number;
        login: string;
        name: string | null;
        avatar_url: string;
      };
      userId?: string; // Supabase user UUID
    }
  }
}

// Cache user lookups by GitHub ID to avoid hitting Supabase on every request
const userCache = new Map<
  string,
  { user: Express.Request['githubUser']; userId: string; token: string; expiresAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function githubAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Verify the request came from the Next.js proxy
  const internalSecret = req.headers['x-internal-secret'] as string | undefined;
  if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const githubId = req.headers['x-user-github-id'] as string | undefined;
  if (!githubId) {
    res.status(401).json({ error: 'Missing user identifier' });
    return;
  }

  // Check cache
  const cached = userCache.get(githubId);
  if (cached && cached.expiresAt > Date.now()) {
    req.githubToken = cached.token;
    req.githubUser = cached.user;
    req.userId = cached.userId;
    next();
    return;
  }

  // Look up user from Supabase
  const { data: row, error } = await supabase
    .from('users')
    .select('id, github_id, username, email, name, avatar_url, access_token')
    .eq('github_id', githubId)
    .single();

  if (error || !row) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  // Decrypt the GitHub token
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!row.access_token || !encryptionKey) {
    res.status(401).json({ error: 'No access token available' });
    return;
  }

  let decryptedToken: string;
  try {
    decryptedToken = decryptToken(row.access_token, encryptionKey);
  } catch {
    res.status(401).json({ error: 'Failed to decrypt access token' });
    return;
  }

  const user = {
    id: row.github_id,
    login: row.username,
    name: row.name ?? null,
    avatar_url: row.avatar_url ?? '',
  };

  // Cache the result
  userCache.set(githubId, {
    user,
    userId: row.id,
    token: decryptedToken,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  req.githubToken = decryptedToken;
  req.githubUser = user;
  req.userId = row.id;
  next();
}

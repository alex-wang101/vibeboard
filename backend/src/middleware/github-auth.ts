import type { Request, Response, NextFunction } from 'express';

// Extend Express Request to include GitHub user info
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
    }
  }
}

export async function githubAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // TODO: Middleware implementation:
  // 1. Extract GitHub token from Authorization header (Bearer token)
  // 2. Call GitHub API (GET /user) to validate the token
  // 3. Attach the GitHub user info and token to the request object
  // 4. Return 401 if token is missing or invalid
  // 5. Cache validation results briefly to avoid hitting GitHub API on every request

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  req.githubToken = token;

  // TODO: Actually validate the token by calling GitHub API
  // For now, pass through for development
  req.githubUser = {
    id: 0,
    login: 'dev-user',
    name: 'Development User',
    avatar_url: '',
  };

  next();
}

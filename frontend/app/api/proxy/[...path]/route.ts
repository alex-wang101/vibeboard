import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || '';

async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.githubId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await params;
  const backendPath = path.join('/');
  const url = new URL(`/${backendPath}`, BACKEND_URL);
  url.search = req.nextUrl.search;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-GitHub-Id': String(token.githubId),
    'X-Internal-Secret': INTERNAL_SECRET,
  };

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') {
    try {
      init.body = JSON.stringify(await req.json());
    } catch {
      // No body — that's fine
    }
  }

  const response = await fetch(url.toString(), init);
  const data = await response.text();

  return new NextResponse(data, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;

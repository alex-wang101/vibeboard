# VibeBoard

Coding agents are getting better at writing code every month. The syntax, the boilerplate, the glue - that part is increasingly solved. What isn't solved is architecture. Knowing what to build, where it belongs in the system, how the pieces connect. As agents take over more of the implementation, getting the architecture right is becoming the only part that really matters.

VibeBoard is a collaborative canvas for that architectural layer. Scan a GitHub repo to generate an interactive dependency graph, or start from a blank canvas and design the system before any code exists. Share the board with your team, import feature branches, merge separate project models. The architecture model is exposed via MCP so your coding agents can reference it as they implement.

## Structure

```
vibeboard/
  frontend/    Next.js app - canvas, auth, project management
  backend/     Express API - code parsing, GitHub integration
  landing/     Marketing site
  shared/      Shared TypeScript types (@vibeboard/shared)
```

## Setup

```bash
# Shared types (build first)
cd shared && npm install && npm run build

# Frontend (port 3000)
cd frontend && npm install
cp .env.example .env.local   # fill in GitHub OAuth + Supabase keys
npm run dev

# Backend (port 4000)
cd backend && npm install
cp .env.example .env          # fill in Supabase service role key
npm run dev

# Landing (port 3001)
cd landing && npm install && npm run dev
```

## Architecture

The frontend handles GitHub OAuth via NextAuth. On sign-in, the user is upserted into Supabase with an encrypted access token. The frontend never sees the raw GitHub token - all backend calls go through a Next.js API proxy that reads the session cookie server-side and forwards a trusted user identifier to Express.

The backend receives the user's GitHub ID, looks up their encrypted token from Supabase, decrypts it, and uses it for GitHub API operations - cloning repos, listing branches, scanning codebases with ts-morph to produce architecture graphs.

The architecture model follows a single `ArchitectureGraph` type shared between frontend and backend. It represents a hierarchical tree of nodes (pages, components, API routes, services) with edges representing dependency flow. The same model is used whether the architecture was scanned from an existing repo or designed from scratch on the canvas.

## Tech

- **Frontend**: Next.js 15, React 19, ReactFlow, Zustand, NextAuth, Tailwind, shadcn/ui
- **Backend**: Express, ts-morph, simple-git, Octokit
- **Database**: Supabase (Postgres)
- **Shared**: TypeScript types, AES-256-GCM token encryption
- **Auth**: GitHub OAuth, JWT sessions, encrypted token storage, BFF proxy pattern

## License

MIT

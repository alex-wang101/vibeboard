# Phase 3: Collaboration

## Goal
Allow multiple users to contribute to one project through direct edits OR comment/suggest changes. The unit of collaboration is a "proposal" (same as Phase 2 agent proposals) — unifying human and agent contributions into one review flow.

## Depends on
- Phase 2 (`phase-2/agentic-layer`) — proposals, overrides, and the approval workflow must exist before multi-user review makes sense.

## Key deliverables

### 1. Roles and permissions
- Three roles: `owner` (full control, manages team), `editor` (propose + approve changes, edit architecture), `viewer` (read-only + comment).
- Stored on existing `contributors` JSONB field on `projects` table — extend with `role` field.
- Backend middleware: check role before mutations. Viewers can't create proposals. Only owners can delete projects or manage team.
- Frontend: hide/disable UI controls based on role.

### 2. Proposals as the unit of collaboration
- Same `ProposedChange` from Phase 2 — now visible to all project members.
- Any editor can create a proposal (manual edit or agent-generated).
- Approval requires owner or editor role (not the proposal author).
- Comments on proposals: `proposal_comments` table `{id, proposal_id, user_id, body, created_at}`.
- Proposal states: `draft` → `pending_review` → `approved` | `rejected` | `withdrawn`.

### 3. Commenting on architecture nodes
- Users can leave comments on any node or edge directly on the canvas.
- `architecture_comments` table: `{id, project_id, target_id, target_type: 'node'|'edge', user_id, body, resolved, created_at}`.
- Rendered as comment badges on canvas nodes (count indicator, click to expand thread).
- Resolve/unresolve flow (like GitHub PR review comments).

### 4. Activity feed
- `project_activity` table: `{id, project_id, user_id, action, target_id, metadata, created_at}`.
- Actions: `proposal_created`, `proposal_approved`, `proposal_rejected`, `comment_added`, `comment_resolved`, `scan_completed`, `enrichment_updated`, `member_added`, `member_removed`.
- Rendered as a sidebar feed on the project page.
- Optional: email/webhook notifications for owners on proposals.

### 5. Real-time sync
- Supabase Realtime subscriptions on `projects`, `proposed_changes`, `architecture_comments`, `project_activity`.
- Frontend subscribes on project page mount — live updates when another user creates a proposal, adds a comment, or approves a change.
- Presence: show avatars of currently-viewing users on the canvas (Supabase Realtime presence channel).
- Cursor sharing (stretch goal): show other users' cursor positions on the canvas.

### 6. Conflict resolution
- Optimistic locking via `last_modified_at` on `project_scans`. If two users submit overlapping proposals, second one gets a conflict warning.
- Simple resolution: last-write-wins for overrides with a merge log entry in activity feed.
- Stretch: side-by-side diff view for conflicting proposals.

## Schema additions
```
Extend contributors: { name, email, role: 'owner'|'editor'|'viewer', github_id }
proposal_comments table
architecture_comments table
project_activity table
```

## Migrations
- 009: Add `role` to contributors JSONB structure (backfill existing as 'owner')
- 010: Create proposal_comments, architecture_comments, project_activity tables
- 011: Enable Supabase Realtime on relevant tables

## Files to create
- `backend/src/middleware/project-auth.ts` — role-based access control per project
- `backend/src/routes/comments.ts` — CRUD for architecture + proposal comments
- `backend/src/routes/activity.ts` — activity feed endpoint
- `frontend/components/canvas/comment-badge.tsx` — comment indicator on nodes
- `frontend/components/canvas/comment-thread.tsx` — expandable comment thread
- `frontend/components/projects/activity-feed.tsx` — sidebar activity log
- `frontend/components/projects/presence-avatars.tsx` — who's viewing
- `frontend/hooks/use-realtime.ts` — Supabase Realtime subscription hook
- `frontend/hooks/use-presence.ts` — Supabase presence channel hook

## Success criteria
- User A creates a proposal. User B sees it appear in real-time without refresh.
- User B comments on the proposal. User A sees the comment live.
- Viewer role can see everything but cannot create proposals or approve changes.
- Activity feed shows a chronological log of all project actions.
- Two users viewing the same project see each other's avatars on the canvas.

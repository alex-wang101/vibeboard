# Phase 2: Agentic Layer (Architecture Editing)

## Goal
Let users and agents propose, preview, and apply architecture changes on top of the enriched graph. The edit surface is shared — agents propose JSON Patches, users make direct edits, both hit the same mutation layer.

## Depends on
- Phase 1 (`phase-1/enrichment-layer`) — enrichment rendering, Overview/Detail toggle, LLM settings UI must be merged first.

## Key deliverables

### 1. User overrides that survive re-scan
- `UserOverride` type: `{targetId, field, value, reason, authoredBy: 'user'|'agent'|'llm'}`.
- Override layer sits ON TOP of structural scan + enrichment. Re-scanning never overwrites them — only invalidates overrides whose target no longer exists (marked `stale`, not deleted).
- Stored in `project_scans.overrides` JSONB column (new migration).
- Merge logic: structural scan → enrichment → overrides → final rendered model.

### 2. Architecture versioning / history
- Every approved change (override, agent patch, enrichment regeneration) creates a snapshot entry.
- `architecture_history` table: `{id, project_id, timestamp, change_type, patch, author, snapshot_hash}`.
- Undo = revert to previous snapshot's override set.
- Not full event-sourcing — just a bounded log (last 50 changes per project) with the ability to roll back.

### 3. Design-from-scratch store mutations
- Wire up the existing stubs in `canvas-store.ts`: `addNode()`, `removeNode()`, `updateNode()`, `addEdge()`, `removeEdge()`.
- `NodePalette` drag-and-drop → `addNode()` with position from drop coordinates.
- Manual nodes get UUID ids (not path-based), `isManual: true`.
- Manual edges get `isManual: true`, user-provided label.

### 4. Agent proposal flow (`MODE_PROPOSE_EDIT`)
- New backend route: `POST /api/projects/:id/proposals` — accepts a user prompt, runs `BASE_ARCHITECT_PROMPT + MODE_PROPOSE_EDIT`, returns a `ProposedChange` with JSON Patch + rationale.
- `ProposedChange` type: `{id, projectId, patch: JsonPatchOp[], rationale, status: 'pending'|'approved'|'rejected', createdAt, authoredBy}`.
- Stored in `proposed_changes` table.

### 5. Proposal preview overlay (frontend)
- Pending proposals rendered as ghosted overlays on the canvas:
  - Proposed new node → dashed outline, 50% opacity, "proposed" badge.
  - Proposed edge → dashed stroke in review color.
  - Proposed deletion → strikethrough on existing node.
- Toolbar shows `N pending changes — review` that opens a diff panel.
- Approve/reject per-proposal or batch.
- On approve: patch applied to overrides, history entry created, proposal status → `approved`.

### 6. Patch validation engine
- `backend/src/services/patch-engine.ts` — validates JSON Patch (RFC 6902) operations:
  - Target paths must resolve to existing nodes/edges (or be create operations).
  - Post-apply state must pass structural validators (no orphan edges, single-level groups, overview node count 14-24).
  - Max 3 retries if agent produces invalid patch (same feedback loop as enricher).

## Schema additions
```
ProposedChange, UserOverride, ArchitectureHistoryEntry
proposed_changes table
architecture_history table
project_scans.overrides JSONB column
```

## Files to create
- `shared/src/overrides.ts` — UserOverride type + merge logic
- `shared/src/proposals.ts` — ProposedChange type
- `backend/src/services/patch-engine.ts` — JSON Patch validation + application
- `backend/src/routes/proposals.ts` — CRUD for proposals
- `frontend/components/canvas/proposal-overlay.tsx` — ghost rendering
- `frontend/components/canvas/proposal-review-panel.tsx` — approve/reject UI
- Migration: overrides + proposed_changes + architecture_history tables

## Success criteria
- User can manually add a node via palette drag-and-drop, re-scan the repo, and see the manual node still present.
- Agent can propose "add a billing service" via natural language, proposal appears as ghost overlay, user approves, override persists.
- User can undo the last 3 changes via history.

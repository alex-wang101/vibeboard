# Phase 4: MCP Execution

## Goal
Expose the architecture model via MCP so Claude, Codex, or any MCP-capable agent can read the system's structure, propose architecture changes, and execute approved changes as real code — then close the loop by re-scanning to keep the model in sync.

## Depends on
- Phase 2 (`phase-2/agentic-layer`) — proposals + overrides + patch engine must exist so the MCP server has something to validate against.
- Phase 1 (`phase-1/enrichment-layer`) — agent prompts + world-model builder + enrichment types.

## Key deliverables

### 1. MCP server
- New package: `backend/src/mcp/server.ts` using `@modelcontextprotocol/sdk`.
- Runs as a separate process or sidecar alongside the Express API.
- Auth: project-scoped API keys (new `project_api_keys` table) so users can grant agent access per-project.

### 2. MCP resources (read)
- `vibeboard://project/{id}/architecture` — full canonical JSON: structural graph + enrichment + overrides. Read-only.
- `vibeboard://project/{id}/summary` — system narrative + overview node list + groups. Compact context for agents that don't need the full graph.
- `vibeboard://project/{id}/files/{path}` — signal file content for a specific path (on-demand, avoids loading everything).
- `vibeboard://project/{id}/proposals` — list of pending proposals.

### 3. MCP tools (write)
- `proposeArchitectureEdit(patch, rationale)` — validates JSON Patch against patch engine, creates a `ProposedChange` in `pending_review` status. Returns proposal id. Does NOT auto-approve.
- `getArchitectureContext(projectId)` — returns the world-model block (same format `buildWorldModelBlock()` produces). Lets the agent load identical context to the enricher.
- `explainSubsystem(projectId, nodeId)` — runs a focused LLM call on a single subsystem using the shared `BASE_ARCHITECT_PROMPT`. Returns prose explanation.

### 4. Scope guards (enforcement, not just prompt)
- Each MCP tool call includes a `scope` parameter: list of node ids the agent is allowed to touch.
- Patch engine rejects operations targeting nodes outside scope.
- Scope is set when the user grants agent access: "Agent can modify Backend group only" → scope = `g:backend` member node ids.
- Logged: every MCP tool call is recorded in `project_activity` with full patch content for audit.

### 5. `MODE_IMPLEMENT` execution path
- After a proposal is approved (Phase 2 flow), user can trigger "implement" from the UI.
- Backend runs `BASE_ARCHITECT_PROMPT + MODE_IMPLEMENT` with the approved patch + structural graph + file tree.
- Agent outputs `{fileChanges: [{path, action, contents}], summary}`.
- **VibeBoard does NOT write files directly.** Instead, it:
  - Generates a diff/patch file or a set of instructions.
  - Exposes the implementation plan via MCP resource: `vibeboard://project/{id}/implementation/{proposalId}`.
  - Claude Code / Codex reads the resource and executes the file changes in the user's workspace.
- This keeps VibeBoard as the architecture layer, not a code editor.

### 6. Bidirectional sync (the closing loop)
- After the agent executes code changes and commits, user triggers a re-scan from VibeBoard.
- Re-scan detects structural changes via `computeDelta()`.
- Overrides that still reference valid nodes → preserved.
- Overrides targeting deleted nodes → marked `stale` with reason.
- New nodes from code changes → appear in structural graph, enricher annotates them (incremental Pass 2 only).
- The approved proposal that triggered the implementation → status updated to `implemented`.
- **Execution receipts** (stretch): agent reports back which files it created/modified. VibeBoard runs a targeted re-scan of only those files instead of a full clone + scan.

### 7. `.vibeboard.json` export for agent bootstrapping
- `GET /api/projects/:id/export` → canonical JSON file containing structural + enrichment + overrides + provenance.
- Agents can read this file from the repo root to bootstrap context without an MCP connection.
- Round-trip tested: `import(export(graph)) === graph`.
- Exporters: Structurizr DSL (C4 standard), Mermaid (`flowchart` / `C4Context`).

## Schema additions
```
project_api_keys: { id, project_id, key_hash, scope, label, created_at, expires_at }
implementation_plans: { id, proposal_id, file_changes JSONB, summary, status, created_at }
```

## Migrations
- 012: project_api_keys table
- 013: implementation_plans table

## Files to create
- `backend/src/mcp/server.ts` — MCP server with resources + tools
- `backend/src/mcp/auth.ts` — project API key verification
- `backend/src/mcp/resources.ts` — resource handlers
- `backend/src/mcp/tools.ts` — tool handlers (proposeArchitectureEdit, getArchitectureContext, explainSubsystem)
- `backend/src/services/implementer.ts` — MODE_IMPLEMENT execution
- `backend/src/services/exporters/structurizr.ts` — Structurizr DSL export
- `backend/src/services/exporters/mermaid.ts` — Mermaid export
- `backend/src/routes/export.ts` — GET export, POST import
- `shared/src/vibeboard-file.ts` — canonical serializer, importFile/exportFile
- `shared/src/schema-version.ts` — schema versioning + migration runner

## Security considerations
- Project API keys are hashed (bcrypt), never stored plaintext.
- Scope enforcement is server-side, not prompt-based. Agent CANNOT bypass scope.
- All MCP tool calls logged to `project_activity` for audit.
- Rate limiting on MCP tools (prevent runaway agent loops).
- `.vibeboard.json` export excludes API keys and user credentials.

## Success criteria
- Claude Code with VibeBoard MCP server configured can run: "What subsystems does this project have?" → reads `vibeboard://project/{id}/summary` → answers accurately.
- Claude Code can run: "Add a billing service to the backend" → calls `proposeArchitectureEdit` → proposal appears in VibeBoard UI as pending.
- User approves the proposal in VibeBoard → clicks "Implement" → implementation plan exposed via MCP → Claude Code reads it and creates the files.
- User re-scans → new billing service files appear in structural graph → enricher annotates them → architecture model is up to date.
- Agent scoped to "Backend only" cannot propose changes to frontend nodes (patch engine rejects).

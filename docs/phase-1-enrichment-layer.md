# Phase 1: Graph + Context Creation (Enrichment Layer)

## Goal
Scan a GitHub repo, build a ground-truth structural graph via ts-morph, then annotate it with LLM-generated semantic labels, groups, flows, and an overview node set. Render the enriched graph in React Flow with Overview/Detail views.

## Status: Backend complete, frontend rendering NOT started.

## What's built (this branch)

### Backend enrichment pipeline
- `shared/src/agent/base-prompt.ts` — shared agent identity (`BASE_ARCHITECT_PROMPT`) + mode appendices + `buildWorldModelBlock()`.
- `backend/src/services/enricher.ts` — two-pass pipeline:
  - Pass 1 (prose): LLM reads compressed tree + signal files + README, writes 8-16 sections describing subsystems.
  - Pass 2 (structured): LLM reads prose + candidate node/edge lists, emits `Enrichment` via forced tool-call.
  - Validation: every id checked against candidate Set, budgets enforced.
  - Retry: up to 3 attempts with `<validation_feedback>`.
  - Cache: skips if `graphHash` matches prior enrichment.
- `backend/src/services/enricher-prompts.ts` — `EMIT_ENRICHMENT_TOOL` schema, `buildCandidateLists()` with pre-suppression (drops tests, configs, barrel re-exports, tiny utilities), compact renderers, signal-file picker.
- `backend/src/services/llm-client.ts` — Anthropic (cloud, BYOK) + Ollama (local, free). Per-user config. JSON recovery fallback for small models.
- `backend/src/services/graph-hash.ts` — SHA256 hash + `computeDelta()`.
- `backend/src/routes/settings.ts` — `GET/PUT /settings/llm` for per-user LLM config.
- `backend/src/routes/scanner.ts` — calls `enrichGraph()` after scan. Non-fatal on failure.
- `backend/src/storage/supabase-store.ts` — TTL cache, enrichment + LLM config persistence.
- Migrations 007 (enrichment columns) + 008 (user LLM config). **Not yet applied.**

### Shared types
- `Enrichment`, `NodeAnnotation`, `EdgeAnnotation`, `SemanticGroup`, `NamedFlow`, `EnrichmentState`, `UserLLMConfig`.

## What's NOT built yet (remaining Phase 1 work)

### Frontend enrichment rendering
- **Overview/Detail toggle** — `viewMode: 'overview' | 'detail'` in canvas store + toolbar toggle component.
- **ELK layout** — replace dagre with `elkjs` `layered` + `NETWORK_SIMPLEX` when groups are present. Dagre can't handle compound/group containers.
- **Groups** — each `SemanticGroup` becomes a React Flow parent node with background tint + label.
- **Edge labels** — cross-group edges show `verbLabel` from `EdgeAnnotation`.
- **Flow highlighting** — selecting a `NamedFlow` dims all other edges, animates stroke-dash along the sequence, pans to fit.
- **Node chrome** — `semanticRole` subtitle under node name, `description` in hover preview + detail panel.

### Frontend LLM settings page
- Settings page where user picks Anthropic vs Ollama, enters API key, chooses models.
- Backend route exists (`/settings/llm`), no frontend UI.

### Testing infrastructure
- CLI test harness: `enrich-cli.ts` script to run enricher against a local dir, output JSON.
- Golden-file regression: committed fixture, re-run + diff on prompt changes.
- Deterministic edge-label sanity checks: use edge metadata (`typeOnlyCount`, `dataFlowCount`, `hasDynamic`, source/target NodeType) to catch semantically wrong labels without LLM cost.

## Files to create (remaining)
- `frontend/components/canvas/view-toggle.tsx` — Overview/Detail switch
- `frontend/lib/elk-layout.ts` — ELK layout wrapper
- `frontend/components/canvas/group-node.tsx` — compound group container
- `frontend/components/canvas/flow-selector.tsx` — named flow dropdown + highlight
- `frontend/app/settings/page.tsx` — LLM settings UI
- `backend/src/scripts/enrich-cli.ts` — CLI test harness

## Files to modify (remaining)
- `frontend/stores/canvas-store.ts` — add `viewMode`, flow selection state
- `frontend/lib/architecture-graph.ts` — apply enrichment + ELK when groups present
- `frontend/components/canvas/detail-panel.tsx` — show annotations
- `frontend/components/canvas/nodes/folder-node.tsx` — semantic role subtitle
- `frontend/components/canvas/nodes/file-node.tsx` — semantic role subtitle
- `frontend/components/canvas/edges/architecture-edge.tsx` — cross-group labels

## Success criteria
- Scan vibeboard itself. Enrichment generates 14-24 overview nodes with sensible groups.
- Toggle Overview → see groups with labeled cross-group edges. Toggle Detail → see full graph unchanged.
- Select "GitHub scan flow" → edges light up in sequence.
- Re-scan unchanged repo → "cache hit" in logs, no LLM call.
- Settings page: switch to Ollama, scan again → enrichment from local model.

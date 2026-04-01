# Basics Workspace — Full Codebase Audit

**Date:** 2026-04-01  
**Scope:** Architecture, code quality, security, performance, infrastructure, automations engine

---

## Executive Summary

The app has a solid foundation — the automations executor is well-architected, auth is mostly consistent, and the app primitive pattern is clean. However, there are **security gaps** (unprotected endpoints, SQL injection risks), **type safety erosion** (79 files with `@ts-nocheck`), **missing production hardening** (pool size=1, no healthcheck, no rate limiting), and **incomplete audit trails** (mutations skipping `logContextEvent()`).

---

## 1. Security

### Critical

| Issue | Location | Detail |
|-------|----------|--------|
| **Unprotected endpoint** | `app/api/context/ask/route.ts` | POST has no auth check — streams to gateway for any caller |
| **SQL injection via WHERE clause** | `app/api/tools/postgresql/utils.ts:155-177`, `app/api/tools/mysql/utils.ts:99-106` | Raw WHERE string interpolation; regex validation is bypassable |
| **Cron secret in query param** | `app/api/cron/schedules/route.ts:31` | `?secret=X` leaks in logs/referer headers — use Authorization header |

### High

| Issue | Location | Detail |
|-------|----------|--------|
| No CSRF protection | `proxy.ts` | Mutation requests not validated with CSRF tokens |
| No rate limiting | All 296 API routes | No middleware to prevent abuse |
| `/api/tools/*` routes are public | `proxy.ts:3` | Intentional for executor, but potential abuse vector |
| Hardcoded production fallback URLs | `app/api/agent/chat/route.ts:10`, `app/api/context/ask/route.ts`, `app/api/copilot/route.ts:24` | `?? "https://api.basicsos.com"` — should fail loudly if GATEWAY_URL unset |
| Environment route lacks org scoping | `app/api/environment/route.ts:16-19` | POST checks session.user.id only, not org context |

---

## 2. Architecture

### App Primitive Violations

Three apps have pages and components but **no manifest.ts and are not registered** in `apps/_registry.ts`:

- `apps/agent/` — has `components/` but no manifest
- `apps/settings/` — has `components/` but no manifest
- `apps/shop/` — has `providers.ts` and components but no manifest

All three have routes at `app/(workspace)/{slug}/page.tsx` that work but bypass the data-driven launchpad.

### Missing Context Event Logging

Per CLAUDE.md, every mutation must call `logContextEvent()`. These skip it:

| Route | Methods |
|-------|---------|
| `app/api/schedules/[id]/route.ts` | PUT, DELETE |
| `app/api/relationships/[id]/route.ts` | DELETE |
| `app/api/settings/route.ts` | PATCH |
| All `app/api/tools/*` routes | Various |

### Circular Store Dependencies

`registry.ts` ↔ `subblock.ts` ↔ `variables.ts` ↔ `workflow.ts` form a dependency triangle. Works due to Zustand's lazy evaluation but is fragile and could cause hydration issues.

### No Global Auth Middleware

Auth is enforced per-route with `requireOrg()`. There's no `middleware.ts` (or `proxy.ts` equivalent) that redirects unauthenticated users away from `(workspace)` routes server-side. The current `proxy.ts` checks cookies but doesn't cover all paths robustly.

---

## 3. Type Safety

| Metric | Count |
|--------|-------|
| Files with `@ts-nocheck` / `@ts-ignore` | **79** |
| `any` type usages in `lib/` | **3,762+** |
| Notable files | `apps/automations/stores/workflow.ts` (2000+ lines, @ts-nocheck), `app/api/tools/mysql/utils.ts` (308 lines, @ts-nocheck) |

`tsconfig.json` has `skipLibCheck: true` and no `noImplicitAny` or `noUncheckedIndexedAccess`, allowing type holes to accumulate silently.

---

## 4. Database

### Critical

- **Pool size = 1** (`lib/db/index.ts:11`) — `{ max: 1 }` blocks concurrent requests in production. Should be 10-20.
- No connection retry logic or timeout configuration.
- No health check or liveness probe.

### Schema Gaps

| Issue | Table/File |
|-------|------------|
| Missing unique constraint on `(organizationId, userId)` | `member` table in `lib/db/schema/auth.ts` |
| `mcpServers`, `memory`, `skill` tables have `orgId` text with no foreign key | `lib/db/schema/phase4.ts` |
| `workflows.isDeployed` not indexed | `lib/db/schema/workflows.ts` |
| `workflow_execution_logs` missing index on `startedAt` alone | `lib/db/schema/workflows.ts` |

---

## 5. Automations Engine

### What's Solid

- **Executor pipeline** — fully implemented with proper error handling, streaming, cancellation, pause points
- **Block registry** — all 14 core handlers present and complete (Agent handler alone is 1,148 lines)
- **150+ block definitions** ported from Sim
- **Canvas** — 1,847 lines, full CRUD, undo/redo, cycle detection, auto-save, SSE execution

### Gaps

| Issue | Location | Severity |
|-------|----------|----------|
| Race condition in run-from-block | `app/api/workflows/[id]/run/route.ts:122-129` — no per-workflow execution lock | Medium |
| No request schema validation on /run | `app/api/workflows/[id]/run/route.ts:35` — malformed IDs passed to executor | Medium |
| Execution logs written after stream completes | `run/route.ts:154-166` — if DB write fails, execution appears successful | Medium |
| Debug mode stubbed | `lib/sim/executor/execution/executor.ts:82` — `continueExecution()` returns error | Low |
| No execution timeout | Executor has no max duration — blocks can hang forever | Medium |
| No backpressure on SSE stream | `run/route.ts:79-199` — slow clients cause memory buildup | Low |

### Stubs / Incomplete

| Feature | File | Status |
|---------|------|--------|
| Knowledge base RAG | `sub-blocks/knowledge-base-selector.tsx:9` | Placeholder |
| Copilot AI integration | Chat UI exists, but no AI agent connected | UI only |
| Dynamic model loading | `stores/providers/store.ts:2-4` | Static list, Phase 4 |
| Subflow enable/lock state | `subflow-node.tsx:60-61` | Hardcoded `true`/`false` |
| Collaborative sync | `variables-panel.tsx:71` | Stubbed |

---

## 6. Performance

| Issue | Detail |
|-------|--------|
| **253+ console.log statements** | Not gated by `NODE_ENV` — production logging noise |
| **No `React.memo` or selector memoization** | Stores consumed without selectors; canvas re-renders on every node change |
| **No dynamic imports** for heavy deps | ReactFlow, react-simple-code-editor loaded eagerly |
| **No canvas virtualization** | Large workflows (500+ blocks) render all nodes in DOM |
| **Position sync thrashing** | `workflow-canvas.tsx:437-455` runs on every nodes change without batching |

---

## 7. Testing

| Metric | Value |
|--------|-------|
| Test files | 22 (all in `lib/sim/executor/` and `lib/copilot/`) |
| API route test coverage | **0%** (296 routes, zero tests) |
| Auth system tests | None |
| Database integration tests | None |
| E2E tests | None |
| Test script in package.json | **Missing** — Vitest installed but no `"test"` script |
| Coverage reporting | Not configured |

---

## 8. Infrastructure & Config

### Environment Variables

13+ env vars used in code but **not documented** in `.env.example`:

`ANTHROPIC_API_KEY`, `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`, `GOOGLE_API_KEY`, `JINA_API_KEY`, `OPENAI_API_KEY`, `SERPER_API_KEY`, `TRELLO_API_KEY`, `TWILIO_PHONE_NUMBER`, `MAX_EXECUTION_TIMEOUT_MS`, `INTERNAL_API_SECRET`

### Docker/Deployment

- Dockerfile is multi-stage, standalone output, non-root user — good base
- **No HEALTHCHECK** instruction in Dockerfile
- **No env validation on startup** — missing DATABASE_URL causes silent failure
- **No graceful shutdown** handler (SIGTERM)
- docker-compose is dev-only (Postgres + pgvector)

### Missing Package Scripts

| Script | Status |
|--------|--------|
| `test` | Missing (Vitest installed) |
| `format` | Missing (no Prettier script) |
| `db:migrate` | Missing (only `db:push`) |
| `db:generate` | Missing |
| `validate` | Missing (no pre-commit hook) |

---

## 9. Dead Code & Hygiene

- `lib/core/utils/cn.ts` exports `Blimp: any = () => null` — unused dummy
- 5 TODO/FIXME comments across codebase (low count, acceptable)
- Some shadcn dependencies may be redundant (`shadcn` 4.1.0 alongside `@base-ui/react`)

---

## Priority Fix List

### P0 — Security (do now)

1. Add `requireOrg()` to `/api/context/ask/route.ts`
2. Replace raw WHERE interpolation with parameterized queries in postgresql/mysql utils
3. Move cron secret from query param to Authorization header

### P1 — Production Blockers (before deploy)

4. Increase DB pool size from 1 to 10-20
5. Add Dockerfile HEALTHCHECK
6. Add env validation on app startup (fail fast if DATABASE_URL missing)
7. Document all 13+ missing env vars in `.env.example`
8. Add `"test": "vitest"` to package.json

### P2 — Data Integrity (soon)

9. Add `logContextEvent()` to schedule, relationship, and settings mutations
10. Add unique constraint on `member(organizationId, userId)`
11. Add foreign keys to phase4 schema tables
12. Add missing DB indexes (isDeployed, startedAt)

### P3 — Quality of Life

13. Register agent, settings, shop apps in `_registry.ts` with manifests
14. Remove `@ts-nocheck` from `workflow.ts` and fix types incrementally
15. Gate console.log statements behind `NODE_ENV !== "production"`
16. Add per-workflow execution lock to prevent race conditions in /run
17. Add execution timeout to prevent hanging blocks

### P4 — Performance (when scaling)

18. Add React.memo / selector memoization to canvas components
19. Dynamic import ReactFlow and code editor
20. Add canvas virtualization for large workflows
21. Add rate limiting middleware

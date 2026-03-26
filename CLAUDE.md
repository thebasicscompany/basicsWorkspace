@AGENTS.md

# basics-workspace — Claude Context

## What This Is

basics-workspace is a company OS desktop/web app. Automations-first. Mac Launchpad-style workspace. Built for teams.

**Read PLAN.md for the full vision, architecture, and implementation phases.**

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4, Radix UI, Framer Motion
- @phosphor-icons/react for all icons
- Drizzle ORM + PostgreSQL (**live** — see `lib/db/`)
- Better Auth (**live** — see `lib/auth.ts`)
- PgBoss (Postgres-native job queue — Phase 2)
- pgvector (semantic search — Phase 2)

## Current Phase

**Phases 0–3D (partial) complete. Phase 3D reconciliation is next.**

- Phase 0: Launchpad, shell, design system ✅
- Phase 1: Auth (Better Auth), DB (Drizzle + Postgres), route groups, logout ✅
- Phase 2: Shared context layer ✅
  - 2A–2D: Records, objects, CRM, context ✅
- Phase 3: Sim + automations engine — **see Sim repo at `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim`**
  - 3A: Schema, settings page, workflow API routes ✅
  - 3B: Automations list page, ReactFlow canvas, block toolbar ✅
  - 3C: Block registry integration, executor-compatible data shapes ✅
  - 3D (partial): Tag system, all 34 input types, edge persistence, executor wiring ✅
  - 3D (remaining): **Sim file reconciliation** — see below

## Auth & DB (live — Phase 1 complete)

### Key files
| File | Purpose |
|------|---------|
| `lib/auth.ts` | betterAuth() server instance, drizzleAdapter, emailAndPassword |
| `lib/auth-client.ts` | createAuthClient — exports `signIn`, `signOut`, `signUp`, `useSession` |
| `lib/db/index.ts` | Lazy postgres singleton (globalThis pattern) |
| `lib/db/schema/auth.ts` | Better Auth tables: user, session, account, verification |
| `lib/db/schema/index.ts` | Re-exports all schema modules |
| `drizzle.config.ts` | Drizzle Kit config — loads `.env.local` via dotenv |
| `app/api/auth/[...all]/route.ts` | Better Auth handler: `export const { GET, POST } = toNextJsHandler(auth)` |
| `scripts/seed.ts` | Seeds admin@example.com / admin123 — run with `npx tsx scripts/seed.ts` |

### Route groups
- `app/(auth)/` — no sidebar (login page lives here)
- `app/(workspace)/` — with WorkspaceSidebar, requires auth

### Proxy (auth guard)
`proxy.ts` at project root — **NOT** `middleware.ts` (Next.js 16 renamed it).
Export the function as `proxy`, not `middleware`:
```ts
export function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] }
```
Checks `better-auth.session_token` cookie; redirects unauthenticated → `/login`.
PUBLIC_PATHS: `["/login", "/api/auth", "/api/function"]`

### Docker
`docker-compose.yml` runs **Postgres only** (not the Next.js app).
Port: **5435** (to avoid conflicts). Named volume: `postgres_data`.
Run Next.js locally with `npm run dev`.

---

## App Primitive — the most important convention

Every workspace app (CRM, Automations, Tasks, etc.) follows this structure:

```
apps/
  _types.ts              ← AppManifest interface — never change this without reading it
  _registry.ts           ← INSTALLED_APPS array — add new apps here
  {slug}/
    manifest.ts          ← app metadata satisfying AppManifest
    components/          ← app-specific UI components
    hooks/               ← app-specific data hooks (future)
    schema.ts            ← Drizzle schema additions (future)

app/                     ← Next.js routes only — thin wrappers
  {slug}/
    page.tsx             ← imports from apps/{slug}/, renders AppHeader + content
```

### To add a new app — always follow these steps in order:

1. Create `apps/{slug}/manifest.ts` satisfying `AppManifest` from `@/apps/_types`
2. Add it to `apps/_registry.ts` INSTALLED_APPS array
3. Create `app/{slug}/page.tsx` as a thin Next.js route
4. Put all components in `apps/{slug}/components/`

**The launchpad is data-driven from INSTALLED_APPS. Do not hardcode app tiles.**

### AppManifest shape (see apps/_types.ts for canonical definition):

```ts
{
  slug: string           // matches folder name and route
  name: string           // display name on tile
  href: string           // primary route
  icon: PhosphorIconComponent
  iconColor: string      // tailwind class, e.g. "text-indigo-500"
  iconWeight?: "fill" | "regular"
  subtitle?: string      // e.g. "3 active"
  isGroup?: boolean      // true = shows 2×2 sub-app preview on tile
  subApps?: SubAppManifest[]
  order?: number         // launchpad display order
}
```

## Shell Components (do not modify without good reason)

| Component | File | Purpose |
|-----------|------|---------|
| `WorkspaceSidebar` | `components/workspace-sidebar.tsx` | 4-icon fixed sidebar |
| `AppHeader` | `components/app-header.tsx` | Breadcrumb + actions bar |
| `PageTransition` | `components/page-transition.tsx` | Fade-in wrapper for every page |
| `AppTile` | `components/launchpad/app-tile.tsx` | 72×72px launchpad tile |
| `ConnectionTile` | `components/launchpad/connection-tile.tsx` | Connection service tile |
| `SectionLabel` | `components/section-label.tsx` | Small-caps section header |
| `EmptyState` | `components/ui/empty-state.tsx` | Empty content placeholder |

## Design Tokens (all defined in app/globals.css)

```
--color-bg-base        #F9F7F4  warm cream, page background
--color-bg-surface     #FFFFFF  cards, panels
--color-bg-sidebar     #EFEDE9  sidebar
--color-border         #E4E2DE  default border
--color-text-primary   #18181B
--color-text-secondary #71717A
--color-text-tertiary  #A1A1AA
--color-accent         #2D8653  Basics brand green, CTAs and active states
--color-accent-light   #E6F4ED  light green tint, active nav backgrounds
```

Font: Inter. All sizes are CSS vars. No Geist, no system fonts.

## Sidebar active state rules

- Home (`/`) is active on `/` AND any app route (`/crm`, `/automations`, `/tasks`, etc.)
- Shop, Agent, Context each own their own prefix
- App routes listed in `APP_ROUTES` constant in `components/workspace-sidebar.tsx`

## Every app page must

1. Start with `<AppHeader breadcrumb={[...]} />`
2. Wrap content in `<PageTransition>`
3. Use `style={{ background: "var(--color-bg-base)" }}` on the content div

## API discipline — every mutation must

Call `logContextEvent()` after writing to the DB. This feeds the Events layer, queues PgBoss jobs for trigger checks and embedding refresh. See `CONTEXT_ARCHITECTURE.md` §Layer 2 for the full helper implementation.

---

## Phase 3: Automations Engine — Architecture & Status

### Sim reference repo
`C:\Users\aravb\Desktop\Code\basics\basicsOS\sim` — the source of truth for all block definitions, executor logic, and canvas interactions. **Our goal is 1:1 functional parity with Sim's workflow system.** UI styling uses our design tokens, but data shapes and behavior must match exactly so the executor works unchanged.

### What exists (Phase 3A–3D complete, 3E definitions done)

| Layer | Files | Status |
|-------|-------|--------|
| **Workflow API** | `app/api/workflows/` | Full CRUD, edge persistence, SSE executor, logs |
| **Function execute** | `app/api/function/execute/` | JS code execution for Function blocks |
| **DB schema** | `lib/db/schema/workflows.ts` | workflows, workflowBlocks, workflowEdges, workflowExecutionLogs, workflowSubflows |
| **Block registry** | `lib/sim/blocks/` | 180+ blocks, ported from Sim verbatim |
| **Sim executor** | `lib/sim/executor/`, `lib/sim/providers/`, `lib/sim/tools/` | Ported, wired to /run endpoint |
| **Gateway integration** | `lib/sim/providers/gateway.ts` | All LLM calls → gateway (GATEWAY_URL env), BYOK support |
| **Canvas** | `apps/automations/components/workflow-canvas.tsx` | ReactFlow canvas, toolbar, edge persistence, Run button, auto-save with subblock sync |
| **Block editor** | `apps/automations/components/block-editor-panel.tsx` | Right-side panel, renders all sub-block input types |
| **Sub-block inputs** | `apps/automations/components/sub-blocks/` | All ported from Sim, using shadcn components (Select, Popover, Button, etc.) |
| **Sub-block hooks** | `sub-blocks/hooks/` | use-sub-block-value, use-sub-block-input — full Sim port |
| **Sub-block controller** | `sub-blocks/sub-block-input-controller.tsx` | Headless controller wiring env-var + tag dropdowns |
| **Tag system** | `apps/automations/lib/tags.ts`, `block-outputs.ts`, `block-path-calculator.ts` | Edge-based accessibility, tag dropdown with portal |
| **Formatted text** | `sub-blocks/formatted-text.tsx` | Prism-based syntax highlighting for references and env vars |
| **Stores** | `apps/automations/stores/` | workflow, registry, subblock, execution, panel, settings, variables, workflow-diff |
| **Trigger definitions** | `lib/sim/triggers/` | 193 files — all 30+ service triggers ported from Sim |
| **Trigger types** | `lib/workflows/triggers/triggers.ts` | TRIGGER_TYPES, StartBlockPath, classifyStartBlockType, StartBlockCandidate |
| **Trigger utils** | `lib/workflows/triggers/trigger-utils.ts` | hasTriggerCapability, generateMockPayload, etc. |

### Gateway Setup
- **Gateway repo**: `C:\Users\aravb\Desktop\Code\basics\basicsAdmin`
- **Gateway port**: 3002 (set in `infra/gateway/.env`)
- **Env vars in `.env.local`**: `GATEWAY_URL=http://localhost:3002`, `GATEWAY_API_KEY=bos_live_sk_...`
- **Provider keys**: Set `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` in gateway's `.env`
- **Models**: All models route through gateway aliases (`basics-chat-fast-openai`, `basics-chat-smart-openai`, etc.)
- **BYOK**: Users can enter their own API key in the Agent block → passed as `x-byok-provider`/`x-byok-api-key` headers

### What works end-to-end (tested)
- Agent blocks with LLM calls (OpenAI, Gemini via gateway)
- Function blocks with JS code execution
- Multi-block chains (Start → Agent → Function)
- Messages input with role selection (system/user/assistant)
- Model dropdown (shadcn Select) with gateway model list
- Auto-save (block edits + subblock value changes → DB)
- Run button with SSE streaming of execution events

### Phase 3E remaining: Trigger Runtime
**See `PLAN-PHASE3E-TRIGGERS.md` for full implementation plan.**

Summary: Trigger *definitions* are done (193 files). The *runtime* that receives webhooks, runs schedules, and executes deployed workflows is not yet built. Key pieces:
1. Webhook receive endpoint (`app/api/webhooks/trigger/[path]/`)
2. Deploy route (`app/api/workflows/[id]/deploy/`)
3. Webhook registration at deploy time (`lib/webhooks/deploy.ts`)
4. Schedule infrastructure (PgBoss cron worker)
5. Deploy button in canvas UI
6. DB schema additions (webhook, workflowSchedule, workflowDeploymentVersion tables)

### Other remaining work
- **Execution logs panel** — show run results in-canvas instead of network tab
- **tool-input.tsx** — still has `@ts-nocheck`, needs MCP/OAuth/custom tools infrastructure to fully port
- **Environment variables** — store is empty, no management UI yet
- **Code editor** — uses react-simple-code-editor + Prism but the emcn Code compound component is a stub

### Phase 3D remaining: Sim file reconciliation

**CRITICAL RULE: Copy Sim files LITERALLY, then fix only import paths.**

We found bugs caused by rewriting Sim code from memory/summaries instead of copying it. The `classifyStartBlockType` stub returning `null` broke all start block output resolution. Going forward:

1. **Use the Read tool** to read the actual Sim source file
2. **File-copy** the code into our repo
3. **Only change import paths** (e.g., `@/blocks` → `@/lib/sim/blocks`, `@/stores/` → `@/apps/automations/stores/`)
4. **Only change auth** if the Sim code calls workspace/auth APIs we don't have yet
5. **Never rewrite logic.** If a function works in Sim, it must work identically here.

#### Files that need 1:1 reconciliation with Sim

**Sim base path:** `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\`

| Sim file | Our file | Status |
|----------|----------|--------|
| `.../sub-block/sub-block.tsx` | `sub-blocks/sub-block-field.tsx` | **REWRITE** — our component map approach works but switch statement logic (props, conditions, wand) is simplified |
| `.../sub-block/hooks/use-sub-block-input.ts` | `sub-blocks/sub-block-input-controller.tsx` | **REWRITE** — missing field helpers, env var dropdown, streaming, DnD |
| `.../sub-block/hooks/use-sub-block-value.ts` | `sub-blocks/shared.ts` useSubBlockValue | **REWRITE** — missing deep equality, streaming refs, collaborative sync |
| `.../sub-block/components/sub-block-input-controller.tsx` | (merged into our controller) | **COPY** — need the real controller that renders both dropdowns |
| `.../sub-block/components/tag-dropdown/tag-dropdown.tsx` | `sub-blocks/tag-dropdown.tsx` | **COPY** — our version is simplified, missing nested tree building, keyboard nav |
| `.../sub-block/components/env-var-dropdown.tsx` | **MISSING** | **COPY** — entire env var system missing |
| `.../sub-block/components/formatted-text.tsx` | (inline in tags.ts) | **COPY** — need the real regex patterns from executor |
| `.../sub-block/components/short-input/short-input.tsx` | `sub-blocks/short-input.tsx` | **COPY** — ours is 18 lines, Sim is 405 (overlay, wand, password, env var) |
| `.../sub-block/components/long-input/long-input.tsx` | `sub-blocks/long-input.tsx` | **COPY** — ours is 17 lines, Sim is 405 (overlay, resize, wand) |
| `.../sub-block/components/code/code.tsx` | `sub-blocks/code-input.tsx` | **COPY** — ours is 16 lines, Sim is 882 (Prism.js, undo/redo, language support) |
| `.../sub-block/components/dropdown/dropdown.tsx` | `sub-blocks/dropdown-input.tsx` | **COPY** — missing async fetch, multi-select, dependency tracking |
| `.../sub-block/components/combobox/combobox.tsx` | `sub-blocks/combobox-input.tsx` | **COPY** — missing async fetch, dependency tracking |
| `.../sub-block/components/table/table.tsx` | `sub-blocks/table-input.tsx` | **COPY** — missing per-cell dropdowns |
| `.../sub-block/components/messages-input/messages-input.tsx` | `sub-blocks/messages-input.tsx` | **COPY** — missing wand, streaming JSON, per-message overlay |
| `.../sub-block/components/condition-input/condition-input.tsx` | `sub-blocks/condition-input.tsx` | **COPY** — missing code editor, per-condition overlay |
| `.../sub-block/components/tool-input/tool-input.tsx` | `sub-blocks/tool-input.tsx` | **COPY** — ours is 160 lines, Sim is 2100 |
| `.../sub-block/components/eval-input/eval-input.tsx` | `sub-blocks/eval-input.tsx` | **COPY** — missing per-field dropdowns |
| `.../sub-block/components/variables-input/variables-input.tsx` | `sub-blocks/variables-input.tsx` | **COPY** — missing workflow variable integration |
| `lib/workflows/blocks/block-outputs.ts` | `apps/automations/lib/block-outputs.ts` | **DONE** — copied with import path fixes |
| `lib/workflows/blocks/block-path-calculator.ts` | `apps/automations/lib/block-path-calculator.ts` | **DONE** — copied |
| `lib/workflows/triggers/triggers.ts` | `lib/workflows/triggers/triggers.ts` | **DONE** — TRIGGER_TYPES + classifyStartBlockType copied |
| `stores/workflows/utils.ts` (mergeSubblockState) | **MISSING** | **COPY** — need full merge with orphaned value handling |

#### What NOT to copy (auth/infra differences)
- Collaborative/socket sync (`useCollaborativeWorkflow`) — we don't have multi-user yet
- Workspace-scoped env vars API — we don't have env var storage yet (stub the API call)
- Wand/AI generation (`useWand` hook) — stub the hook, wire later
- OAuth credential management — stub credential selectors

### Key conventions

- **COPY FIRST, ADAPT SECOND.** Read Sim file with Read tool → copy to our repo → change only import paths and auth calls.
- **Data shapes are sacred.** `BlockState`, `SubBlockState`, `SubBlockConfig` must match Sim exactly.
- **Use `useSubBlockStore`** for all subblock value read/writes.
- **Block definitions in `lib/sim/blocks/blocks/` are read-only.**
- **UI styling** uses our design tokens (CSS vars, Phosphor icons). The shadcn components use `@base-ui/react` not Radix — check component APIs before using.

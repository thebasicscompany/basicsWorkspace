# Phase 3: Automations Engine — Implementation Plan

> **Last updated:** 2026-03-25. Research basis: deep read of Sim (`C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim`), basicsAdmin gateway (`C:\Users\aravb\Desktop\Code\basics\basicsAdmin\packages\gateway`), and full audit of basics-workspace Phases 0–2.

---

## Executive Summary

Phase 3 ports the Sim workflow engine into basics-workspace's Automations app. Sim is a production-grade DAG executor with 200+ integrations, a React Flow canvas, and a complete block/tool/provider system. The strategy is **copy the core verbatim, adapt the seams**.

**What we copy from Sim:**
- Complete DAG executor (`executor/` — ~3,000 lines of pure Node.js)
- Block registry (200+ block configs)
- Serializer/deserializer
- React Flow canvas, block/edge nodes, config panel, sub-block inputs
- Zustand stores for canvas + execution state
- Integration icons (`components/icons.tsx`)

**What we replace/adapt:**
- Sim's `providers/` (direct LLM calls) → **single gateway provider** hitting `GATEWAY_URL/v1/chat/completions`
- Sim's OAuth token mgmt → **gateway owns tokens** — we call `/v1/connections` and `/v1/execute/...`
- `@sim/db` / `@sim/logger` → `@/lib/db` / `console`
- `workspaceId` → `orgId` throughout
- Sim's auth → `requireOrg()` from `lib/auth-helpers.ts`
- Tool execution → calls gateway's `/v1/execute/{provider}/{action}` server-side
- No `oauthConnections` table — gateway's DB owns this

---

## Setup — Before Writing Any Code

### VS Code Multi-Root Workspace

Both repos must be open simultaneously. Create `C:\Users\aravb\Desktop\Code\basics\basics.code-workspace`:

```json
{
  "folders": [
    { "name": "basics-workspace", "path": "C:/Users/aravb/desktop/code/basics/basics-workspace" },
    { "name": "sim", "path": "C:/Users/aravb/Desktop/Code/basics/basicsOS/sim/apps/sim" }
  ]
}
```

Open this file in VS Code. Both projects appear in the sidebar with full IntelliSense. Use this to read Sim files and copy into basics-workspace. Do NOT clone Sim inside basics-workspace — Sim is a Turbo/bun monorepo and would conflict with basics-workspace's npm/Next.js setup.

### Bulk Copy from Sim

Run once from basics-workspace root before starting any porting work. Creates the directory skeleton that will be modified:

```bash
SIM="C:/Users/aravb/Desktop/Code/basics/basicsOS/sim/apps/sim"

# Executor core + blocks + tools + serializer → lib/sim/
mkdir -p lib/sim
cp -r "$SIM/executor"   lib/sim/executor
cp -r "$SIM/blocks"     lib/sim/blocks
cp -r "$SIM/tools"      lib/sim/tools
cp -r "$SIM/providers"  lib/sim/providers   # gutted and replaced with gateway.ts in 3A.2
cp -r "$SIM/serializer" lib/sim/serializer

# Canvas components → apps/automations/components/canvas/
mkdir -p apps/automations/components/canvas/nodes
mkdir -p apps/automations/components/canvas/edges
mkdir -p apps/automations/components/canvas/menus
cp -r "$SIM/components/workflow-block"  apps/automations/components/canvas/nodes/workflow-block
cp -r "$SIM/components/workflow-edge"   apps/automations/components/canvas/edges/workflow-edge
cp -r "$SIM/components/note-block"      apps/automations/components/canvas/nodes/note-block
cp -r "$SIM/components/subflows"        apps/automations/components/canvas/nodes/subflows
cp -r "$SIM/components/panel"           apps/automations/components/canvas/panel
cp -r "$SIM/components/block-menu"      apps/automations/components/canvas/menus/block-menu
cp -r "$SIM/components/canvas-menu"     apps/automations/components/canvas/menus/canvas-menu
cp -r "$SIM/components/action-bar"      apps/automations/components/canvas/action-bar
cp    "$SIM/components/icons.tsx"       apps/automations/components/icons.tsx

# Stores → apps/automations/stores/
mkdir -p apps/automations/stores
cp "$SIM/stores/workflows/workflow/store.ts"  apps/automations/stores/workflow.ts
cp "$SIM/stores/workflows/workflow/types.ts"  apps/automations/stores/workflow-types.ts
cp "$SIM/stores/workflows/subblock/store.ts"  apps/automations/stores/subblock.ts
cp "$SIM/stores/execution/store.ts"           apps/automations/stores/execution.ts
cp "$SIM/stores/panel/store.ts"               apps/automations/stores/panel.ts
```

### Global Import Rewrites (after bulk copy)

Do a project-wide find-replace across all files under `lib/sim/` and `apps/automations/`:

| Find | Replace |
|------|---------|
| `from '@sim/db'` | `from '@/lib/db'` |
| `from '@sim/logger'` | `from '@/lib/sim/logger'` |
| `from '@/blocks/` | `from '@/lib/sim/blocks/` |
| `from '@/tools/` | `from '@/lib/sim/tools/` |
| `from '@/providers/` | `from '@/lib/sim/providers/` |
| `from '@/executor/` | `from '@/lib/sim/executor/` |
| `from '@/serializer/` | `from '@/lib/sim/serializer/` |
| `workspaceId` | `orgId` |

Then create `lib/sim/logger.ts` as a thin stub:
```typescript
export const createLogger = (name: string) => ({
  info: (...args: unknown[]) => console.log(`[${name}]`, ...args),
  warn: (...args: unknown[]) => console.warn(`[${name}]`, ...args),
  error: (...args: unknown[]) => console.error(`[${name}]`, ...args),
})
```

---

## Architecture Overview

```
basics-workspace/
├── lib/
│   ├── sim/                          ← PORTED from Sim (no UI, pure logic)
│   │   ├── executor/                 ← DAGExecutor, ExecutionEngine, handlers
│   │   ├── blocks/                   ← BlockConfig registry (200+ blocks)
│   │   ├── tools/                    ← ToolConfig definitions per integration
│   │   ├── providers/                ← REPLACED: single gateway provider (not Sim's multi-provider)
│   │   │   ├── types.ts              ← Keep ProviderRequest/ProviderResponse interfaces
│   │   │   └── gateway.ts            ← NEW: calls GATEWAY_URL/v1/chat/completions
│   │   ├── serializer/               ← SerializedWorkflow types + logic
│   │   └── types.ts
│   └── db/schema/
│       └── workflows.ts              ← NEW: 5 workflow tables
│
├── apps/automations/
│   ├── manifest.ts                   ← EXISTS (stub, no changes)
│   └── components/
│       ├── AutomationsList.tsx       ← Workflow list + create/delete/rename
│       ├── canvas/
│       │   ├── WorkflowCanvas.tsx    ← React Flow canvas (ported from Sim)
│       │   ├── nodes/                ← WorkflowBlock, NoteBlock, SubflowNode
│       │   ├── edges/                ← WorkflowEdge
│       │   └── panel/                ← Config panel + sub-block inputs
│       └── stores/                   ← Zustand stores (ported from Sim)
│
└── app/(workspace)/automations/
    ├── page.tsx                      ← List view
    └── [id]/page.tsx                 ← Canvas view
```

---

## Gateway Integration

### LLM Calls

All LLM requests go through `GATEWAY_URL/v1/chat/completions` (OpenAI-compatible).

**`lib/sim/providers/gateway.ts`** replaces Sim's entire `providers/` directory:

```typescript
// Single provider — wraps GATEWAY_URL
async function callGateway(req: ProviderRequest, gatewayApiKey: string): Promise<ProviderResponse> {
  const res = await fetch(`${process.env.GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${gatewayApiKey}`,
      // BYOK passthrough if user configured their own keys:
      ...(req.byokProvider && { 'x-byok-provider': req.byokProvider, 'x-byok-api-key': req.byokApiKey }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model,            // e.g. 'basics-chat-smart'
      messages: req.messages,
      tools: req.tools,
      stream: req.stream ?? false,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
    }),
  })
  // parse OpenAI-compatible response → ProviderResponse
}
```

**Model aliases to use** (gateway's `GET /v1/models`):
| Use case | Alias |
|----------|-------|
| Fast chat | `basics-chat-fast` |
| Smart chat | `basics-chat-smart` |
| Embeddings | `basics-embed` |

**BYOK:** Users can enter their own OpenAI/Anthropic/Gemini key in settings. Stored per-org. Passed as `x-byok-provider` + `x-byok-api-key` headers to gateway. No quota applied.

### OAuth Connections

**Gateway owns all OAuth tokens.** basics-workspace never stores or handles OAuth tokens.

| Action | basics-workspace does |
|--------|----------------------|
| List connections | `GET GATEWAY_URL/v1/connections` with org's API key |
| Connect a provider | `GET GATEWAY_URL/v1/connections/{provider}/authorize` → redirect user to returned URL |
| OAuth callback | Gateway handles at `GATEWAY_URL/oauth/{provider}/callback`, redirects back to basics-workspace |
| Disconnect | `DELETE GATEWAY_URL/v1/connections/{provider}` |
| Execute a tool | `POST GATEWAY_URL/v1/execute/{provider}/{action}` — gateway decrypts token + calls provider API |

**`X-User-Id` = `orgId`** for all gateway calls. Connections are org-level (one Gmail per org, not per user). Per-user connections are a future RBAC feature.

**`redirectAfter`** in OAuth flow: pass the launchpad connections page (`/`) or Shop connections tab as the redirect URL so users land back in the app after authorizing.

### Tool Execution Pattern

When the executor runs a block that calls an integration (Gmail, Slack, etc.):

```
Block handler → builds tool params → calls lib/sim/tools/{provider}/action.ts
→ tool.request.url = `${GATEWAY_URL}/v1/execute/gmail/read`
→ tool.request.headers = { Authorization: `Bearer ${org.gatewayApiKey}`, 'X-User-Id': orgId }
→ Gateway decrypts stored token → calls Gmail API → returns result
→ Tool transforms response → executor continues
```

This means Sim's tool files need their `request.url` changed from provider API URLs to gateway execute URLs. The request body params map cleanly because the gateway's execute routes use essentially the same params as Sim's tools.

### Settings — API Key Storage

New column on `organization` table (or a new `org_settings` table):
- `gatewayApiKey` — the org's `bos_live_sk_...` key, entered by admin in Settings
- `byokProvider` + `byokApiKey` — optional BYOK override

Settings page (`/settings`) — Phase 3A includes a minimal settings page with just the API key field.

---

## Gateway Route Structure (basicsAdmin changes)

Refactor the existing monolithic `execute.ts` into per-provider files. Add new providers from Sim.

```
packages/gateway/src/routes/
├── execute/
│   ├── index.ts              ← Hono router, mounts all sub-routers
│   ├── slack.ts              ← /execute/slack/* (message, channels, etc.)
│   ├── gmail.ts              ← /execute/gmail/* (read, send, sync)
│   ├── google-sheets.ts      ← /execute/google-sheets/* (read, write, append)
│   ├── google-drive.ts       ← /execute/google-drive/* (list, upload)
│   ├── google-calendar.ts    ← /execute/google-calendar/* (list-events, create-event)
│   ├── github.ts             ← /execute/github/* (90+ from Sim)
│   ├── notion.ts             ← /execute/notion/* (search, create-page, query-db)
│   ├── hubspot.ts            ← /execute/hubspot/* (contacts, deals)
│   └── _stubs/               ← new providers (returns 501 until implemented)
│       ├── airtable.ts
│       ├── linear.ts
│       ├── stripe.ts
│       ├── asana.ts
│       └── ... (copy pattern from Sim tools, add as needed)
│
└── connections/
    ├── index.ts              ← mounts all OAuth handlers
    ├── google.ts             ← Google OAuth (covers Gmail, Sheets, Drive, Calendar)
    ├── slack.ts
    ├── github.ts
    ├── notion.ts
    ├── hubspot.ts
    └── _stubs/               ← new providers
        ├── airtable.ts
        ├── linear.ts
        └── ...
```

**Adding a new provider** (e.g., Airtable):
1. Add OAuth config to `connections/_stubs/airtable.ts` (~30 lines: scopes, URLs, env vars)
2. Move Sim's tool HTTP call logic into `execute/_stubs/airtable.ts` (~50-80 lines per action) — swap `params.accessToken` for the gateway's `getDecryptedTokens()` helper
3. Promote from `_stubs/` when done
4. Add `AIRTABLE_CLIENT_ID` + `AIRTABLE_CLIENT_SECRET` to gateway `.env`

**Copy fidelity from Sim tools:**
| Provider | Copy % | Notes |
|----------|--------|-------|
| Google Sheets | ~95% | Nearly identical HTTP calls |
| Google Calendar | ~95% | Straightforward datetime handling |
| GitHub | ~90% | 90+ ops in Sim vs 4 in gateway today |
| Slack | ~85% | Sim adds DMs, threads, file attachments |
| Notion | ~80% | Deep property nesting, Sim is more complete |
| HubSpot | ~75% | Token refresh is the complex piece |
| Gmail (read/send) | ~70% | Some Sim ops route through internal endpoints |
| Google Drive upload | ~60% | Multipart boundary logic, error-prone |
| Gmail sync | ~50% | Full MIME parsing + incremental history |

---

## DB Schema — New Tables

**File:** `lib/db/schema/workflows.ts`

```typescript
// 1. workflows
workflows {
  id          uuid PK default gen_random_uuid()
  orgId       uuid NOT NULL FK → organization.id
  userId      uuid NOT NULL FK → user.id
  name        text NOT NULL DEFAULT 'Untitled Workflow'
  description text
  color       text DEFAULT '#3B82F6'
  isDeployed  boolean DEFAULT false
  deployedAt  timestamp
  runCount    integer DEFAULT 0
  lastRunAt   timestamp
  variables   jsonb DEFAULT '{}'
  archivedAt  timestamp
  sortOrder   integer DEFAULT 0
  createdAt   timestamp DEFAULT now()
  updatedAt   timestamp DEFAULT now()
  INDEX (orgId, archivedAt, sortOrder)
}

// 2. workflowBlocks
workflowBlocks {
  id           uuid PK default gen_random_uuid()
  workflowId   uuid NOT NULL FK → workflows.id CASCADE DELETE
  type         text NOT NULL       // 'agent' | 'if' | 'api' | 'gmail' | etc.
  name         text NOT NULL
  positionX    numeric DEFAULT 0
  positionY    numeric DEFAULT 0
  enabled      boolean DEFAULT true
  advancedMode boolean DEFAULT false
  height       integer
  subBlocks    jsonb DEFAULT '{}'  // all sub-block param values
  outputs      jsonb DEFAULT '{}'  // output field definitions
  data         jsonb DEFAULT '{}'  // extra block metadata
  createdAt    timestamp DEFAULT now()
}

// 3. workflowEdges
workflowEdges {
  id             uuid PK default gen_random_uuid()
  workflowId     uuid NOT NULL FK → workflows.id CASCADE DELETE
  sourceBlockId  uuid NOT NULL FK → workflowBlocks.id CASCADE DELETE
  targetBlockId  uuid NOT NULL FK → workflowBlocks.id CASCADE DELETE
  sourceHandle   text
  targetHandle   text
  createdAt      timestamp DEFAULT now()
}

// 4. workflowSubflows — loops + parallels
workflowSubflows {
  id         uuid PK default gen_random_uuid()
  workflowId uuid NOT NULL FK → workflows.id CASCADE DELETE
  type       text NOT NULL  // 'loop' | 'parallel'
  config     jsonb NOT NULL DEFAULT '{}'
  createdAt  timestamp DEFAULT now()
}

// 5. workflowExecutionLogs
workflowExecutionLogs {
  id              uuid PK default gen_random_uuid()
  workflowId      uuid NOT NULL FK → workflows.id CASCADE DELETE
  orgId           uuid NOT NULL
  executionId     uuid NOT NULL DEFAULT gen_random_uuid()
  status          text NOT NULL  // 'running' | 'success' | 'error' | 'cancelled'
  trigger         text           // 'manual' | 'scheduled' | 'webhook' | 'context_event'
  startedAt       timestamp DEFAULT now()
  endedAt         timestamp
  totalDurationMs integer
  executionData   jsonb DEFAULT '{}'  // BlockLog[] array
  cost            jsonb               // token cost breakdown
  INDEX (workflowId, startedAt DESC)
  INDEX (orgId, startedAt DESC)
}
```

**Note:** Skip `pausedExecutions`, `resumeQueue`, `workflowExecutionSnapshots` for Phase 3. Human-in-loop = Phase 4.

Also add to `organization` table (migration): `gatewayApiKey text`, `byokProvider text`, `byokApiKey text`.

---

## Dependencies to Add

**basics-workspace:**
```bash
npm install @xyflow/react        # React Flow v12 (check Sim's package.json for exact version)
npm install elkjs                # Auto-layout (elk algorithm)
npm install @radix-ui/react-context-menu
npm install cmdk                 # Command palette for block search/add
```

Note: `zustand`, `@radix-ui/react-tooltip/dialog/dropdown-menu` already installed. No LLM provider SDKs needed — all LLM goes through gateway via `fetch`.

**basicsAdmin gateway** (when adding providers):
```bash
# No new deps needed for most providers — all calls are plain fetch()
# Exception: some providers have official SDKs that simplify auth (e.g. @octokit/rest for GitHub)
```

---

## Sub-Phase Breakdown

---

### Phase 3A — Foundation (DB + Executor + Settings)

**Goal:** Workflows in DB, executor runs server-side, org can store their gateway API key.

#### 3A.1 — DB Schema

- Write `lib/db/schema/workflows.ts` (5 tables above)
- Add `gatewayApiKey`, `byokProvider`, `byokApiKey` to organization schema
- Update `lib/db/schema/index.ts` to re-export
- Run `npx drizzle-kit generate && npx drizzle-kit migrate`

#### 3A.2 — Port Executor Core

Copy these from Sim into `lib/sim/`, then do import path rewrites:

```
executor/execution/{executor,engine,state,types}.ts
executor/dag/{builder,types}.ts
executor/dag/construction/{nodes,edges,loops,parallels,paths}.ts
executor/handlers/registry.ts
executor/handlers/{agent,api,condition,router,function,response,
                   variables,workflow,wait,evaluator,trigger,generic,
                   mothership,human-in-the-loop}/
blocks/{types,registry,utils}.ts + blocks/blocks/*.ts
tools/{types,registry}.ts + tools/{integration}/*.ts
serializer/{index,types}.ts
```

**Import rewrites (global search-replace):**
| From | To |
|------|----|
| `@sim/db` | `@/lib/db` |
| `@sim/logger` | `console` (or a thin `lib/sim/logger.ts` wrapper) |
| `@/stores/` | `@/apps/automations/stores/` |
| `@/blocks/` | `@/lib/sim/blocks/` |
| `@/tools/` | `@/lib/sim/tools/` |
| `@/providers/` | `@/lib/sim/providers/` |
| `@/executor/` | `@/lib/sim/executor/` |
| `@/serializer/` | `@/lib/sim/serializer/` |
| `workspaceId` | `orgId` |

**Replace `providers/` entirely** with `lib/sim/providers/gateway.ts` — single implementation that calls `GATEWAY_URL/v1/chat/completions`.

**Adapt tool `request.url`** for OAuth tools: change from provider API URLs to `${GATEWAY_URL}/v1/execute/{provider}/{action}`.

**Remove/stub:** Redis cancellation, Trigger.dev SDK refs, WebSocket/socket logic, collaborative editing hooks.

#### 3A.3 — Settings Page (Minimal)

`app/(workspace)/settings/page.tsx` — new page with:
- "Gateway API Key" input → saves to `organization.gatewayApiKey`
- "BYOK" section — optional provider + key
- `POST /api/settings` route to save

#### 3A.4 — Workflow API Routes

```
app/api/workflows/route.ts           GET (list, cursor-paginated) + POST (create)
app/api/workflows/[id]/route.ts      GET (full workflow) + PATCH (metadata) + DELETE (soft)
app/api/workflows/[id]/run/route.ts  POST → SSE stream of block events
app/api/workflows/[id]/logs/route.ts GET (execution history)
```

The `/run` route:
1. `requireOrg(request)` → `{ orgId, userId }`
2. Load org's `gatewayApiKey` from DB
3. Load workflow + blocks + edges + subflows from DB
4. Build `SerializedWorkflow` from DB rows
5. `DAGExecutor.execute(serialized, { workflowId, workspaceId: orgId, userId, gatewayApiKey, onBlockStart, onBlockComplete, onStream })`
6. SSE stream events back to client
7. On completion: save to `workflowExecutionLogs` + `logContextEvent({ eventType: 'automation.ran' })`

---

### Phase 3B — Workflow List UI

**Goal:** `/automations` shows a list of workflows. Create, rename, delete.

**Files:**
- `app/(workspace)/automations/page.tsx` — thin route, renders `<AutomationsList />`
- `apps/automations/components/AutomationsList.tsx` — list with "New Workflow" button, run count, last run, status badge, right-click menu (rename/duplicate/delete)
- `apps/automations/hooks/useWorkflows.ts` — React Query hooks wrapping `/api/workflows`

Port Sim's `stores/workflows/registry/store.ts` → `apps/automations/stores/registry.ts`, adapted for `fetch('/api/workflows')`.

---

### Phase 3C — Canvas UI

**Goal:** `/automations/[id]` opens the workflow builder.

#### Layer 1 — Canvas Shell

`app/(workspace)/automations/[id]/page.tsx` — thin route → `<WorkflowCanvas />`

`apps/automations/components/canvas/WorkflowCanvas.tsx` — port from Sim's `workflow.tsx`:
- ReactFlow provider, 3 node types (`workflowBlock`, `subflowNode`, `noteBlock`), 1 edge type (`workflowEdge`)
- Drag-drop blocks from toolbar
- Keyboard shortcuts (delete, Ctrl+C/V, Ctrl+Z/Y, Ctrl+S)
- **Remove:** WebSocket/collaborative cursor logic, deployment tab, diff view

Port these Sim files:
```
workflow-block/workflow-block.tsx  → canvas/nodes/WorkflowBlock.tsx
workflow-edge/workflow-edge.tsx    → canvas/edges/WorkflowEdge.tsx
note-block/note-block.tsx          → canvas/nodes/NoteBlock.tsx
subflows/subflow-node.tsx          → canvas/nodes/SubflowNode.tsx
block-menu/block-menu.tsx          → canvas/menus/BlockContextMenu.tsx
canvas-menu/canvas-menu.tsx        → canvas/menus/CanvasContextMenu.tsx
action-bar/action-bar.tsx          → canvas/ActionBar.tsx
components/icons.tsx               → apps/automations/components/icons.tsx
```

#### Layer 2 — Stores

Port verbatim (pure Zustand, no Sim-specific deps):
```
apps/automations/stores/workflow.ts    ← blocks, edges, loops, parallels state
apps/automations/stores/subblock.ts   ← sub-block parameter values
apps/automations/stores/execution.ts  ← runtime highlighting (active/success/error blocks)
apps/automations/stores/panel.ts      ← panel width, active tab (persisted localStorage)
```

#### Layer 3 — Config Panel + Sub-block Inputs

`apps/automations/components/canvas/panel/Panel.tsx` — tabs: Editor | Variables | Toolbar (skip Copilot + Deploy for MVP)

Sub-block input components (port from `sim/components/panel/components/editor/`):
```
short-input        long-input         code
dropdown           combobox           switch
slider-input       file-upload        condition-input
messages-input     credential-selector eval-input
tool-input         tag-dropdown        sub-block-input-controller
```

**`credential-selector`** — adapted for gateway: calls `GET GATEWAY_URL/v1/connections` to list connected accounts. Shows "Connect [Provider] in Shop →" if not connected.

**Tool visibility in toolbar:** Show all 200+ blocks. Blocks requiring unconnected OAuth show a "Connect" badge on the node and a connect prompt in the config panel. Not hidden — browsable for discovery.

#### Layer 4 — Block Toolbar

`apps/automations/components/canvas/panel/toolbar/BlockToolbar.tsx`
- Search blocks by name/type
- Grouped by category: Triggers | Logic | AI | Integrations
- Click to add at canvas center / drag to position
- Port from `sim/components/panel/components/toolbar/`

---

### Phase 3D — Execution Pipeline

**Goal:** Run button → blocks highlight live → logs shown.

Covered in 3A.4 (run API with SSE). Additional client side:

`apps/automations/hooks/useWorkflowExecution.ts`:
- EventSource connecting to `/api/workflows/[id]/run`
- On `block_start` → add to `execution.activeBlockIds`
- On `block_complete` → move to `lastRunPath` (success/error)
- On `stream` → append to block's streaming output
- On `done` → clear active, show summary

---

### Phase 3E — Connections UI (Gateway-backed)

**Goal:** Launchpad and Shop show real connection status. Users can connect/disconnect providers.

**No DB schema changes needed** — gateway owns all OAuth tokens.

**basics-workspace API routes** (thin proxies to gateway):
```
app/api/connections/route.ts
  GET  → proxies to GATEWAY_URL/v1/connections (with org's API key)

app/api/connections/[provider]/route.ts
  GET  → proxies to GATEWAY_URL/v1/connections/{provider}/authorize
           returns { url } — client redirects user to this URL
  DELETE → proxies to GATEWAY_URL/v1/connections/{provider}
```

**No `/oauth/callback` route needed in basics-workspace** — the gateway handles this and redirects the user back to basics-workspace with `?connected=provider` in the query string.

**UI:**
- `ConnectionTile` on launchpad — call `/api/connections` to get real status (green dot = connected)
- Shop connections tab — same data, "Connect" / "Disconnect" buttons
- `credential-selector` sub-block input — same `/api/connections` call, inline connect button

**Supported providers at launch** (gateway has these live):
Slack, Gmail, Google Sheets, Google Drive, Google Calendar, GitHub, Notion, HubSpot

---

### Phase 3F — Context Layer Integration

**Goal:** Context events trigger automations. Automation runs log to context. Workers are wired.

#### 3F.1 — Workspace Event Trigger Block

`lib/sim/blocks/blocks/context-trigger.ts` — new block:
```typescript
{
  type: 'context_trigger',
  name: 'Workspace Event',
  category: 'triggers',
  subBlocks: [
    { id: 'eventType', type: 'dropdown',
      options: ['record.created', 'record.updated', 'record.deleted',
                'contact.created', 'deal.updated', 'task.completed', ...] },
    { id: 'filter', type: 'condition-input', title: 'Filter (optional)' },
  ]
}
```

#### 3F.2 — Context Query Block

`lib/sim/blocks/blocks/context-query.ts` — new block:
```typescript
{
  type: 'context_query',
  name: 'Query Workspace',
  category: 'tools',
  tools: { access: ['context_query'] },
  subBlocks: [
    { id: 'objectType', type: 'dropdown', options: ['contacts', 'companies', 'deals', 'tasks', 'notes'] },
    { id: 'filters', type: 'filter-builder' },
    { id: 'limit', type: 'short-input', defaultValue: '10' },
  ]
}
```

`lib/sim/tools/context/query.ts` — calls `POST /api/records` internally.

#### 3F.3 — PgBoss Worker Wiring

`lib/queue/workers.ts` — implement the stubs:

```typescript
// check-automation-triggers:
// 1. Receive context_event job payload { eventType, entityId, orgId, metadata }
// 2. Query workflows table for active workflows with context_trigger blocks matching eventType
// 3. For each match: enqueue run-automation job

// run-automation:
// 1. Load workflow from DB (blocks + edges + subflows)
// 2. Load org's gatewayApiKey from DB
// 3. Build SerializedWorkflow
// 4. DAGExecutor.execute(serialized, { workspaceId: orgId, trigger: 'context_event', ... })
// 5. Save to workflowExecutionLogs
// 6. logContextEvent({ eventType: 'automation.ran', entityId: workflowId, ... })
```

---

## Env Vars

**basics-workspace `.env.local`** (already updated):
```bash
GATEWAY_URL=http://localhost:3001        # https://api.basicsos.com in prod
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3001
# GATEWAY_API_KEY stored per-org in DB (organization.gatewayApiKey), not here
```

**basicsAdmin gateway `.env`** (add when implementing new providers):
```bash
# Already exists: SLACK_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET
# GITHUB_CLIENT_ID/SECRET, NOTION_CLIENT_ID/SECRET, HUBSPOT_CLIENT_ID/SECRET

# Add as providers are implemented:
# AIRTABLE_CLIENT_ID=
# AIRTABLE_CLIENT_SECRET=
# LINEAR_CLIENT_ID=
# LINEAR_CLIENT_SECRET=
# STRIPE_SECRET_KEY=         ← API key, not OAuth
# RESEND_API_KEY=            ← API key, not OAuth
```

---

## Order of Implementation

```
Phase 3A (foundation):
  3A.1  DB schema — workflows tables + org.gatewayApiKey column
  3A.2  Port executor core → lib/sim/ (import rewrites + gateway provider)
  3A.3  Settings page — API key entry
  3A.4  Workflow API routes — CRUD + SSE run

Phase 3B (list UI):
  3B    Workflow list — AutomationsList, useWorkflows, registry store

Phase 3C (canvas):
  3C.1  Canvas shell — React Flow setup, node/edge types
  3C.2  Stores — workflow, subblock, execution, panel
  3C.3  Config panel + all sub-block input types
  3C.4  Block toolbar

Phase 3D (execution):
  3D    SSE execution stream + canvas highlighting

Phase 3E (connections):
  3E    /api/connections proxy routes + ConnectionTile + credential-selector wiring

Phase 3F (context integration):
  3F.1  context_trigger block
  3F.2  context_query block + tool
  3F.3  PgBoss worker implementation
```

---

## What NOT to Port

| Sim Feature | Reason |
|------------|--------|
| `providers/openai`, `providers/anthropic`, etc. | Replaced by single gateway provider |
| WebSocket / collaborative editing | Over-engineering for MVP |
| Deployment / versioning system | Phase 4 |
| Copilot AI canvas assistant | Phase 3D+ (after canvas ships) |
| Human-in-loop / pause-resume | Phase 4 |
| MCP tool selector | Phase 4 |
| Skill / plugin system | Phase 4 |
| `pausedExecutions`, `resumeQueue` DB tables | Phase 4 |
| Billing / usage tracking UI | Handled by gateway dashboard |
| EE (enterprise) features | Phase 4 |
| Deep research / multi-turn agents | Phase 4 |

---

## Key Adaptation Notes

**1. Tool request URLs** — For every OAuth-backed Sim tool, change:
```
// Sim (direct to provider):
request: { url: 'https://slack.com/api/chat.postMessage', headers: (p) => ({ Authorization: `Bearer ${p.accessToken}` }) }

// basics-workspace (via gateway):
request: { url: `${process.env.GATEWAY_URL}/v1/execute/slack/message`, headers: (p) => ({ Authorization: `Bearer ${p.gatewayApiKey}`, 'X-User-Id': p.orgId }) }
```

**2. Agent block** — `AgentBlockHandler` calls `executeProvider(providerRequest)`. Replace Sim's provider registry lookup with a single call to `callGateway(req, gatewayApiKey)`.

**3. Auth in API routes** — Replace `getSession()` calls in any ported Sim API routes with `requireOrg(request)`.

**4. Icons** — Port `components/icons.tsx` from Sim (200+ SVG integration icons). They're just React SVG components — zero conflict with Phosphor icons used in the shell.

**5. Package manager** — basics-workspace uses npm. Sim uses bun. No code differences — bun is just their package manager. Ported TypeScript files are identical.

**6. `@xyflow/react` version** — Check Sim's `package.json` for exact version before installing to avoid API differences.

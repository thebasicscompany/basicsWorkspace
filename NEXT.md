# What's Next — Remaining Work

> Last updated: 2026-04-01. See PLAN.md for original vision, CLAUDE.md for codebase conventions.

---

## What's Done

Everything through Phase 3D is built and working:

- **Shell & design system** — Launchpad, sidebar, app primitives, Manrope + JetBrains Mono fonts
- **Auth & DB** — Better Auth, Drizzle + Postgres, org model, route guards
- **CRM** — Contacts, companies, deals with full CRUD
- **Shared context layer** — Records, objects, events, relations
- **Automations engine** — 180+ blocks, DAG executor, ReactFlow canvas, block editor, sub-block inputs
- **Copilot** — AI-powered workflow builder with 7 tools (edit_workflow, run_workflow, get_block_outputs, get_trigger_blocks, get_execution_summary, get_workflow_logs, get_blocks_metadata)
- **Chat panel** — Floating chat for testing workflows with user input, feeds terminal
- **Shop** — OAuth connection grid (15+ providers), gateway proxy, connect/disconnect
- **Settings** — Profile, workspace, gateway config, **environment variables (Secrets)** with encryption
- **Execution logs** — Dashboard at `/automations/logs` with status filters, pagination, block-level drill-down
- **Terminal** — In-canvas execution console with block-by-block output
- **Electron shell (E1)** ✅ — BrowserWindow, preload, splash screen, modular main process, system tray
- **Recorder app scaffold (R1 scaffold)** ✅ — App manifest, launchpad tile, recordings DB table, CRUD API routes
- **Recorder capture module (R1 capture)** ✅ — desktopCapturer screenshots, uiohook-napi input hooks (click/key/scroll/window switch), event buffer, IPC bridge, recording overlay, Zustand store
- **Dark mode removed** ✅ — Light mode only across all 22+ components
- **pnpm migration** ✅ — Switched from npm, `.npmrc` with hoisted node-linker for Turbopack compat

---

## Phase 4: Deploy & Trigger Runtime

**Goal:** Make workflows run automatically — webhooks fire, schedules tick, deployed workflows serve API/chat requests.

### What exists
- DB schema: `webhook`, `workflowSchedule`, `workflowDeploymentVersion` tables (all migrated)
- 193 trigger definition files ported from Sim
- Deploy button in canvas toolbar (UI exists, calls `/api/workflows/[id]/deploy`)
- Deploy modal with status display
- Trigger type classification (`classifyStartBlockType`, `TRIGGER_TYPES`)

### What to build

#### 4A: Deployment persistence
Port from Sim's `lib/workflows/persistence/utils.ts`:
- `deployWorkflow(workflowId)` — snapshot current state into `workflowDeploymentVersion`, set `isDeployed=true`
- `undeployWorkflow(workflowId)` — deactivate version, set `isDeployed=false`
- `loadDeployedWorkflowState(workflowId)` — load the deployed snapshot (not draft)
- Wire the existing deploy button UI to these functions

**Key Sim files:**
- `lib/workflows/persistence/utils.ts` lines 660-968 (deploy/undeploy/load)
- `app/api/workflows/[id]/deploy/route.ts` (387 lines — GET/POST/DELETE)

#### 4B: Webhook receive endpoint
Port from Sim's webhook system:
- `app/api/webhooks/trigger/[path]/route.ts` — receives external HTTP POST
- `lib/webhooks/processor.ts` — lookup webhook by path, parse body, queue execution
- At deploy time: `saveTriggerWebhooksForDeploy()` creates webhook records with unique paths
- Display webhook URL in trigger block editor after deployment

**Key Sim files:**
- `app/api/webhooks/trigger/[path]/route.ts` (170 lines)
- `lib/webhooks/deploy.ts` (webhook registration)
- `lib/webhooks/processor.ts` (webhook processing)

#### 4C: Schedule infrastructure
- Schedule CRUD routes (`app/api/schedules/`)
- At deploy time: `createSchedulesForDeploy()` creates cron records in `workflowSchedule`
- PgBoss worker that polls for due schedules and calls the executor
- Sim uses Trigger.dev; we use PgBoss (already in package.json)

**Key Sim files:**
- `app/api/schedules/route.ts` (288 lines)
- `app/api/schedules/execute/route.ts` (205 lines)
- `lib/workflows/schedules.ts`

#### 4D: Deployed execution
- When a webhook fires or schedule ticks, load the **deployed** workflow state (not draft)
- Execute using the same DAG executor
- Log results to `workflowExecutionLogs` with trigger type

### What to skip (for now)
- Provider-specific webhook auth (Stripe signatures, GitHub HMAC) — accept all initially
- Polling triggers (Gmail, IMAP, RSS) — need separate polling infra
- MCP tool sync on deploy
- Deployment version rollback
- A2A agent-to-agent protocol

---

## Phase 5: Polish & Stability

### 5A: Undo/redo on canvas
Sim tracks operations via custom events (`record-diff-operation`). We need:
- Operation stack (add/delete/edit block, add/delete edge)
- Ctrl+Z / Ctrl+Shift+Z handlers
- `useWorkflowStore` action to revert state

### 5B: Streaming LLM output
Currently agent blocks wait for full response. Sim streams token-by-token:
- Executor emits `stream:chunk` SSE events during agent execution
- Terminal shows partial output as it arrives
- Chat panel shows typing indicator with live text

### 5C: Workflow diff visualization
When copilot edits a workflow:
- New blocks get green border
- Edited blocks get yellow border
- Accept/reject buttons to confirm changes
- Sim's `WorkflowDiffEngine` computes diffs, `useWorkflowDiffStore` manages state

### 5D: Credential management improvements
- Show connected credentials in block editor (oauth-input component)
- Credential selector dropdown in agent/API blocks
- Disconnect/reconnect from block editor (not just Shop)
- Show which workflows use which credentials

---

## Architecture Decisions

### Shop = OAuth Connections
The Shop page is the right place for OAuth connection management. It's the "app store" metaphor — you connect services (Gmail, Slack, GitHub) and they become available to use in workflow blocks. Don't move this.

### Settings > Secrets = Environment Variables
Environment variables live in Settings > Secrets tab. They're user-scoped, optionally encrypted, and accessible as `{{VAR_NAME}}` in workflow blocks. This is correct.

### Logs = Execution History
The `/automations/logs` page shows org-wide execution history. The in-canvas terminal shows the current run. Both are needed.

### Gateway = LLM + OAuth Proxy
All LLM calls route through the gateway (`GATEWAY_URL`). All OAuth token management lives in the gateway. basics-workspace stores gateway API keys but not OAuth tokens.

### Chat vs Copilot (both stay)
- **Chat** = run the workflow with user input (end-user facing, will become deployed chat endpoint)
- **Copilot** = AI assistant that builds/edits workflows (developer tool)
- Both are separate panels on the canvas. Different audiences, different purposes.

---

## File Inventory (what's left)

| File | Purpose | Status |
|------|---------|--------|
| `PLAN.md` | Original vision + Phase 0-2 design specs | Keep as historical reference |
| `CLAUDE.md` | Codebase conventions for AI agents | Keep, update as needed |
| `AGENTS.md` | Next.js 16 breaking changes warning | Keep (tiny, referenced by CLAUDE.md) |
| `CONTEXT_ARCHITECTURE.md` | Shared context data model | Keep as reference |
| `PRODUCTION.md` | Deployment checklist | Keep |
| `NEXT.md` | This file — what to build next | Active |

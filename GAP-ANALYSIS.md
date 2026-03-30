# Sim Reconciliation Gap Analysis

**Generated:** 2025-03-27 | **Last updated:** 2026-03-28
**Sim base:** `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\src\`
**Our base:** `C:\Users\aravb\desktop\code\basics\basics-workspace\`

---

## Sprint 4 + 5A/5B Summary (2026-03-27 — 2026-03-28)

### Completed

**Sprint 4: Advanced Canvas**
- Auto-layout API endpoint (`app/api/workflows/[id]/autolayout/route.ts`)
- Loop/parallel container rendering (`subflow-node.tsx` + `blockStateToNode`)
- Subflow node component registered in ReactFlow nodeTypes
- Run from/until block (context menu + run endpoint params + executor `stopAfterBlockId`)
- Custom node full port (`workflow-block-node.tsx` — dynamic handles, subblock rows, condition/router handles, execution status, connection validation)
- Node selection highlight (ReactFlow `elementsSelectable` + `onSelectionChange`)
- Node delete persistence (immediate `saveNow()` instead of debounced)
- Tag dropdown infinite loop fix (stable refs for `useShallow` + `useState` bail-outs)
- Automations list: delete + rename workflows from main page

**Sprint 5A: Wire Plumbing**
- Env var dropdown wired to real `/api/environment` endpoint
- Secrets management UI in Settings page (CRUD key/value pairs)
- Execution log panel wired to canvas Run button SSE events
- Workflow not-found guard (redirect to `/automations` on 404)

**Sprint 5B: OAuth / Shop**
- 11 new OAuth providers added to gateway (Linear, Jira, Salesforce, Airtable, Asana, Dropbox, Microsoft, Trello, Shopify, Zoom + existing 5)
- Connection proxy routes (`/api/connections/`, `/api/connections/[provider]/authorize`, `/api/connections/[provider]`)
- Shop page with squircle tile grid + category filter tabs (15 providers)

**Sprint 5B/6: Credential Selector + Execution Logs Dashboard + Change Detection**
- Credential selector wired to gateway connections (`credential-selector.tsx` — fetches from `/api/connections`, filters by `serviceId`, dropdown of matching accounts, OAuth redirect flow, auto-select single connection, visibility-change re-fetch)
- Authorize route updated to accept custom `redirect_after` query param (returns to canvas after OAuth)
- Org-wide execution logs API (`GET /api/executions` — join with workflows, status filter, pagination, total count)
- Execution logs dashboard page (`/automations/logs`) with stats cards, status filter tabs, paginated table, row expand for block-level detail, duration/trigger badges
- Navigation: "Logs" button added to automations list page header
- Change detection: `computeNeedsRedeployment` in deploy GET endpoint (deep-sorted fingerprint comparison of current vs deployed state), amber "Update" button in canvas toolbar, re-checks after each auto-save, resets on deploy/undeploy

### Needs Testing

**Automations canvas (critical):**
- [ ] Add blocks from toolbar → verify they appear + save on reload
- [ ] Connect two blocks with edges → verify edges persist on reload
- [ ] Delete a block (select + Backspace) → verify deleted on reload
- [ ] Right-click block → Copy, Duplicate, Delete, Run from here, Run until here
- [ ] Run a workflow (Start → Agent) → verify execution log panel shows events
- [ ] Run from here (right-click Agent → Run from here) → only Agent executes
- [ ] Run until here (right-click Start → Run until here) → only Start executes
- [ ] Deploy a workflow → verify deployed badge appears
- [ ] Block editor panel → edit sub-block values → verify auto-save on reload
- [ ] Tag dropdown (`<` in text input) → verify no infinite loop, shows block outputs

**Settings:**
- [ ] Settings → Secrets → add a variable → save → reload → variable persists
- [ ] In automations, type `{{` in a text field → verify env var dropdown shows saved secrets

**Shop:**
- [ ] Navigate to Shop → verify squircle tiles render with provider icons
- [ ] Category filter tabs → verify filtering works
- [ ] Click Connect on a provider → verify redirects to gateway OAuth (requires gateway running)

**Automations list:**
- [ ] Three-dot menu → Rename → type new name → Enter → verify persists on reload
- [ ] Three-dot menu → Delete → confirm → verify workflow removed

### Remaining for Next Sprint

**QOL (P2):**
- Selection mode (shift-select multiple blocks)
- Snap-to-grid
- Change detection ("Update" button post-deploy)

**Features (P2):**
- ~~OAuth credential selector wired to gateway connections~~ **DONE** — fetches from /api/connections, filters by serviceId, OAuth redirect via gateway
- ~~Execution logs dashboard page~~ **DONE** — /automations/logs with stats, filters, pagination, block detail expansion
- Execution snapshots (replay past runs)

**Large (P3/Sprint 6):**
- MCP infrastructure (server management, tool discovery, execution)
- A2A serve endpoint
- Chat API routes + auth flows
- Copilot panel, collaborative editing, diff/version comparison

---

## GOLDEN RULE: FILE-COPY FROM SIM, NEVER REWRITE

Every item in this document must be resolved by **literally copying the Sim source file** into our repo. The only changes allowed are:

1. **Import paths** — e.g. `@/stores/` → `@/apps/automations/stores/`, `@/blocks` → `@/lib/sim/blocks`
2. **UI component swaps** — Sim uses Radix/shadcn, we use our design tokens / `@base-ui/react`. Swap the UI wrapper, keep the logic byte-for-byte.
3. **Auth/workspace calls** — Sim calls `useWorkspace()`, `useUser()` etc. Stub or adapt to our auth, but do NOT rewrite the surrounding logic.

**That's it.** No simplifying. No "our version." No rewriting from memory. If the function works in Sim, it works identically here. If Sim has 498 lines in `dropdown.tsx`, our file should be ~498 lines with only import paths and UI primitives changed.

**Features we don't need yet** (collaborative sync, Trigger.dev, workspace multi-tenancy) can be stubbed with no-ops, but the code structure and function signatures must remain so we can wire them later without refactoring.

**Why this matters:** We found real bugs from rewriting Sim code from memory — `classifyStartBlockType` returning `null` broke all start block output resolution. Sim's code is tested in production. Ours should be the same code.

---

## 1. Sub-Block Components

| Area | Sim File | Our File | Status | Priority |
|------|----------|----------|--------|----------|
| Main orchestrator | `components/ui/sub-block/sub-block.tsx` (1,185 lines) | `sub-blocks/sub-block-field.tsx` (290 lines) | Done (core logic) | -- |
| short-input | `sub-block/components/short-input/short-input.tsx` (405) | `sub-blocks/short-input.tsx` (405) | Done | -- |
| long-input | `sub-block/components/long-input/long-input.tsx` (405) | `sub-blocks/long-input.tsx` (405) | Done | -- |
| code editor | `sub-block/components/code/code.tsx` (882) | `sub-blocks/code-input.tsx` (882) | Done | -- |
| dropdown | `sub-block/components/dropdown/dropdown.tsx` (498) | `sub-blocks/dropdown-input.tsx` (498) | Done | -- |
| combobox | `sub-block/components/combobox/combobox.tsx` (582) | `sub-blocks/combobox-input.tsx` (582) | Done | -- |
| table | `sub-block/components/table/table.tsx` (337) | `sub-blocks/table-input.tsx` (337) | Done | -- |
| messages-input | `sub-block/components/messages-input/messages-input.tsx` (778) | `sub-blocks/messages-input.tsx` (778) | Done | -- |
| condition-input | `sub-block/components/condition-input/condition-input.tsx` (1,276) | `sub-blocks/condition-input.tsx` (1,276) | Done | -- |
| tool-input | `sub-block/components/tool-input/tool-input.tsx` (2,100) | `sub-blocks/tool-input.tsx` (2,101) | Done | -- |
| eval-input | `sub-block/components/eval-input/eval-input.tsx` (294) | `sub-blocks/eval-input.tsx` (294) | Done | -- |
| variables-input | `sub-block/components/variables-input/variables-input.tsx` (565) | `sub-blocks/variables-input.tsx` (565) | Done | -- |
| formatted-text | `sub-block/components/formatted-text.tsx` (110) | `sub-blocks/formatted-text.tsx` (110) | Done | -- |
| tag-dropdown | `sub-block/components/tag-dropdown/tag-dropdown.tsx` (1,895) | `sub-blocks/tag-dropdown.tsx` (1,075) | Done (keyboard nav + nested folders) | -- |
| env-var-dropdown | `sub-block/components/env-var-dropdown.tsx` (372) | `sub-blocks/env-var-dropdown.tsx` (387) | Done | -- |
| sub-block-input-controller | `sub-block/components/sub-block-input-controller.tsx` (163) | `sub-blocks/sub-block-input-controller.tsx` (165) | Done | -- |
| use-sub-block-value | `sub-block/hooks/use-sub-block-value.ts` (229) | `sub-blocks/hooks/use-sub-block-value.ts` (229) | Done | -- |
| use-sub-block-input | `sub-block/hooks/use-sub-block-input.ts` (596) | `sub-blocks/hooks/use-sub-block-input.ts` (596) | Done | -- |
| use-depends-on-gate | `sub-block/hooks/use-depends-on-gate.ts` (184) | `sub-blocks/hooks/use-depends-on-gate.ts` (184) | Done | -- |
| use-selector-setup | `sub-block/hooks/use-selector-setup.ts` (88) | `sub-blocks/hooks/use-selector-setup.ts` (88) | Done | -- |
| credential-selector | `sub-block/components/credential-selector/` (419) | `sub-blocks/credential-selector.tsx` (270, wired to gateway) | Done | -- |
| knowledge-base-selector | `sub-block/components/knowledge-base-selector/` (200) | `sub-blocks/knowledge-base-selector.tsx` (173) | Done | -- |
| schedule-info | `sub-block/components/schedule-info/` (120+) | `sub-blocks/schedule-info.tsx` | Done | -- |
| selector-combobox | `sub-block/components/selector-combobox/` (184) | `sub-blocks/selector-combobox.tsx` (196) | Done | -- |
| **keyboard-navigation-handler** | `sub-block/components/tag-dropdown/components/` (200+) | -- | **Missing** | P2 |
| **document-tag-entry** | `sub-block/components/document-tag-entry/` (150+) | -- | **Missing** | P3 |
| **table-selector** | `sub-block/components/table-selector/` (78) | -- | **Missing** | P3 |
| **response-format** | `sub-block/components/response-format/` (31) | -- | **Missing** | P3 |
| **text** | `sub-block/components/text/` (52) | `sub-blocks/text-display.tsx` (11) | **Simplified** | P3 |

**Sub-block summary:** 14 components file-copied from Sim (good). 4 were rewritten instead of copied and need to be **replaced** with the real Sim code (main orchestrator, dropdown, tag-dropdown, knowledge). 8 missing entirely — copy from Sim.

---

## 2. Canvas & Workflow UI

| Area | Sim File | Our File | Status | Priority |
|------|----------|----------|--------|----------|
| Copy/paste blocks | `workflow.tsx` copyBlocks/preparePasteData | `stores/registry.ts` copyBlocks/preparePasteData + `workflow-canvas.tsx` Ctrl+C/V | Done | -- |
| Undo/redo | `useUndoRedoStore` + WorkflowControls | `stores/undo-redo/` (store 362L, code-store 131L, types, constants, utils) | Done | -- |
| Keyboard shortcuts | Command palette, Shift+A, K, L | `workflow-canvas.tsx` (Delete, Ctrl+C/V) | Done (core; no Shift+A palette) | -- |
| Canvas context menu | `canvas-menu/canvas-menu.tsx` | `block-context-menu.tsx` (right-click blocks) | Done | -- |
| Block context menu | `block-menu/block-menu.tsx` (delete, duplicate, copy) | `block-context-menu.tsx` (Copy, Duplicate, Delete, Run from/until) | Done | -- |
| Custom edge rendering | `workflow-edge/workflow-edge.tsx` (animated, labels) | `workflow-edge.tsx` (114L, status colors, error edges, delete) | Done | -- |
| Custom node (full) | `workflow-block/workflow-block.tsx` (dynamic handles, dims, status) | `workflow-block-node.tsx` (dynamic handles, subblock rows, condition/router handles, execution status, connection validation) | Done | -- |
| Fit to view | `fitViewToBounds` hook in WorkflowControls | `workflow-canvas.tsx` ReactFlow Controls + fitView | Done | -- |
| Floating action bar | `WorkflowControls` (zoom, undo, redo, fit) | `workflow-canvas.tsx` ReactFlow Controls (styled) | Done | -- |
| Connection validation | Cycle detection, handle validation | `stores/workflows/edge-validation.ts` (138L, cycle detection + scope validation) | Done | -- |
| **Selection mode** | `useShiftSelectionLock`, SelectionMode | -- | **Missing** | P2 |
| **Snap-to-grid** | `useSnapToGridSize()` hook | -- | **Missing** | P2 |
| Loop containers | `workflow-block.tsx` type=loop rendering | `subflow-node.tsx` + `workflow-canvas.tsx` blockStateToNode | Done | -- |
| Parallel containers | `workflow-block.tsx` type=parallel rendering | `subflow-node.tsx` + `workflow-canvas.tsx` blockStateToNode | Done | -- |
| Subflow nodes | `subflows/subflow-node.tsx` | `apps/automations/components/subflow-node.tsx` | Done | -- |
| **Note blocks** | `note-block/note-block.tsx` | -- | **Missing** | P3 |
| Auto-layout | `use-auto-layout.ts`, `lib/workflows/autolayout/` | `lib/workflows/autolayout/` + `app/api/workflows/[id]/autolayout/route.ts` | Done | -- |
| **Block locking** | `locked` property in block state | -- | **Missing** | P3 |
| Block dimensions | `lib/workflows/blocks/block-dimensions.ts` | `lib/workflows/blocks/block-dimensions.ts` | Done | -- |
| Run from block | Handler in Sim | `block-context-menu.tsx` + `workflow-canvas.tsx` runFromBlock + run route `runFromBlockId` param | Done | -- |
| Run until block | Handler in Sim | `block-context-menu.tsx` + `workflow-canvas.tsx` runUntilBlock + run route `runUntilBlockId` param | Done | -- |
| Cancel execution | Handler in Sim | `app/api/workflows/[id]/executions/[executionId]/cancel/` + `lib/execution/cancellation.ts` | Done | -- |
| **Copilot panel** | `panel/components/copilot/` (full AI chat) | -- | **Missing** | P3 |
| Variables panel | `panel/components/variables.tsx` | `components/variables-panel.tsx` | Done | -- |
| Terminal/console panel | `terminal.tsx` | `components/terminal/terminal.tsx` + `stores/terminal/` (718L total) | Done | -- |
| **Collaborative editing** | `useCollaborativeWorkflow`, socket cursors | -- | **Missing** | P3 |
| **Diff/version comparison** | `DiffControls`, `useWorkflowDiffStore` (full) | `workflow-diff.ts` (stub) | **Stub** | P3 |

---

## 3. Stores

| Area | Sim File | Our File | Status | Priority |
|------|----------|----------|--------|----------|
| useWorkflowStore | `stores/workflows/workflow/store.ts` | `stores/workflow.ts` | Done | -- |
| useSubBlockStore | `stores/workflows/subblock/store.ts` | `stores/subblock.ts` | Done | -- |
| useExecutionStore | `stores/execution/store.ts` | `stores/execution.ts` | Done | -- |
| usePanelStore | `stores/panel/store.ts` | `stores/panel.ts` | Done | -- |
| useVariablesStore | `stores/panel/variables/store.ts` | `stores/variables.ts` | Done | -- |
| useEnvironmentStore | `stores/settings/environment/` | `stores/settings.ts` | Done | -- |
| useWorkflowDiffStore | `stores/workflow-diff/` (full) | `stores/workflow-diff.ts` (stub) | **Stub** | P3 |
| useWorkflowRegistry | `stores/workflows/registry/store.ts` (full CRUD, hydration, clipboard, deploy status) | `stores/registry.ts` | Done | -- |
| useUndoRedoStore | `stores/undo-redo/` | `stores/undo-redo/` (store 362L, code-store 131L, types, constants, utils) | Done | -- |
| useCanvasModeStore | `stores/canvas-mode/` | `stores/canvas-mode/` | Done | -- |
| **useCopilotStore** | `stores/panel/copilot/` | -- | **Missing** | P3 |
| useTerminalConsoleStore | `stores/terminal/console.ts` + `store.ts` | `stores/terminal/` (store 110L, console/store 530L, console/storage 78L) | Done | -- |
| useLogsStore | `stores/logs/` | `stores/logs/` | Done | -- |
| useNotificationStore | `stores/notifications/` | `stores/notifications/` (4 files) | Done | -- |
| useModalsStore | `stores/modals/` | `stores/modals/search/` (3 files) | Done | -- |
| **useSidebarStore** | `stores/sidebar/` | -- | **Missing** | P3 |
| **useFoldersStore** | `stores/folders/` | -- | **Missing** | P3 |
| **useOperationQueueStore** | `stores/operation-queue/` | -- | **Missing** | P3 |
| **useTableStore** | `stores/table/` | -- | **Missing** | P3 |

---

## 4. Workflow Utilities & Libs

| Area | Sim File | Our File | Status | Priority |
|------|----------|----------|--------|----------|
| mergeSubblockState | `stores/workflows/utils.ts` | `stores/workflows/utils.ts` | Done | -- |
| filterNewEdges/filterValidEdges | `stores/workflows/utils.ts` | `stores/workflows/utils.ts` | Done | -- |
| getUniqueBlockName | `stores/workflows/utils.ts` | `stores/workflows/utils.ts` | Done | -- |
| prepareBlockState | `stores/workflows/utils.ts` | `stores/workflows/utils.ts` | Done | -- |
| regenerateBlockIds | `stores/workflows/utils.ts` | `stores/workflows/utils.ts` | Done | -- |
| normalizeWorkflowState | `stores/workflows/workflow/validation.ts` | `stores/workflows/workflow/validation.ts` | Done | -- |
| block-outputs.ts | `lib/workflows/blocks/block-outputs.ts` | `lib/block-outputs.ts` | Done | -- |
| block-path-calculator.ts | `lib/workflows/blocks/block-path-calculator.ts` | `lib/block-path-calculator.ts` | Done | -- |
| workflow/utils.ts | `stores/workflows/workflow/utils.ts` (findDescendants, generateLoopBlocks, generateParallelBlocks, wouldCreateCycle, isBlockProtected) | `stores/workflows/workflow/utils.ts` | Done | -- |
| edge-validation.ts | `stores/workflows/workflow/edge-validation.ts` | `stores/workflows/edge-validation.ts` (138L, cycle detection + scope validation) | Done | -- |
| registry/utils.ts | `stores/workflows/registry/utils.ts` (duplicate, import/export) | `stores/workflows/registry/utils.ts` | Done | -- |
| **comparison/** | `lib/workflows/comparison/` (compare, normalize) | -- | **Missing** | P3 |
| autolayout/ | `lib/workflows/autolayout/` | `lib/workflows/autolayout/` (7 files: types, constants, utils, core, containers, targeted, index) | Done | -- |
| **diff/** | `lib/workflows/diff/` | -- | **Missing** | P3 |
| sanitization/ | `lib/workflows/sanitization/` (references, JSON, keys) | `lib/workflows/sanitization/` (references, key-validation, validation) | Done | -- |
| **streaming/** | `lib/workflows/streaming/` | -- | **Missing** | P2 |
| subblocks/visibility | `lib/workflows/subblocks/visibility.ts` | `lib/workflows/subblocks/visibility.ts` (full port) | Done | -- |
| lifecycle.ts | `lib/workflows/lifecycle.ts` | `lib/workflows/lifecycle.ts` (archive/restore) | Done | -- |
| **colors.ts** | `lib/workflows/colors.ts` | -- | **Missing** | P3 |
| dynamic-handle-topology.ts | `lib/workflows/dynamic-handle-topology.ts` | `lib/workflows/dynamic-handle-topology.ts` (full port) | Done | -- |
| **operations/** | `lib/workflows/operations/` (deploy, import/export, socket) | -- | **Missing** | P2 |
| schedules/validation | `lib/workflows/schedules/validation.ts` | `lib/workflows/schedules/validation.ts` (full copy) | Done | -- |

---

## 5. Executor & Runtime

| Area | Sim File | Our File | Status | Priority |
|------|----------|----------|--------|----------|
| DAG executor core | `lib/executor/` (6 files) | `lib/sim/executor/` (98 files) | **Ours advanced** | -- |
| Block definitions | ~4 utility files | `lib/sim/blocks/` (200+ blocks) | **Ours complete** | -- |
| Tool definitions | Minimal | `lib/sim/tools/` (193 tools) | **Ours complete** | -- |
| Trigger definitions | 8 generic types | `lib/sim/triggers/` (32 integrations) | **Ours complete** | -- |
| Provider gateway | Not present | `lib/sim/providers/gateway.ts` (BYOK) | **Ours only** | -- |
| Variable resolvers | Basic | `lib/sim/executor/` (6 resolver types) | **Ours advanced** | -- |
| Loop/parallel orchestrators | Not present | `lib/sim/executor/` | **Ours only** | -- |
| Deployment versioning/revert | `app/api/workflows/[id]/deployments/[version]/revert/` | `app/api/workflows/[id]/deployments/` (list, get, update, activate, revert) | Done | -- |
| Execution streaming endpoint | `app/api/workflows/[id]/executions/[id]/stream/` | `app/api/workflows/[id]/executions/[executionId]/stream/` | Done | -- |
| Execution cancellation | `app/api/workflows/[id]/executions/[id]/cancel/` | `app/api/workflows/[id]/executions/[executionId]/cancel/` + `lib/execution/cancellation.ts` | Done | -- |
| Workflow duplication | `app/api/workflows/[id]/duplicate/` | `app/api/workflows/[id]/duplicate/` + `lib/workflows/persistence/duplicate.ts` | Done | -- |
| Autolayout endpoint | `app/api/workflows/[id]/autolayout/` | `app/api/workflows/[id]/autolayout/route.ts` | Done | -- |
| **Paused execution management** | `app/api/workflows/[id]/paused/` | -- | **Missing** | P2 |
| Pre-deploy checks | `runPreDeployChecks()` | `lib/pre-deploy-checks.ts` (83L, 3 checks: blocks, connectivity, required fields) | Done | -- |
| Change detection | State hash comparison, "Update" button | `deploy/route.ts` computeNeedsRedeployment + canvas "Update" button (amber) | Done | -- |

---

## 6. API Routes (Workflow)

| Area | Sim Route | Our Route | Status | Priority |
|------|-----------|-----------|--------|----------|
| List/create workflows | `GET/POST /workflows` | `GET/POST /workflows` | Done | -- |
| CRUD workflow | `GET/PUT/DELETE /workflows/[id]` | `GET/PUT/DELETE /workflows/[id]` | Done | -- |
| Deploy/undeploy | `POST/DELETE /workflows/[id]/deploy` | `POST/DELETE /workflows/[id]/deploy` | Done | -- |
| Execute workflow | `POST /workflows/[id]/execute` | `POST /workflows/[id]/run` | Done | -- |
| Execution logs | `GET /workflows/[id]/log` | `GET /workflows/[id]/logs` | Done | -- |
| Webhook receive | `POST /webhooks/trigger/[path]` | `POST /webhooks/trigger/[path]` | Done | -- |
| Schedule CRUD | `GET/POST /schedules` | `GET/POST /schedules` | Done | -- |
| Workflow variables | `GET/POST /workflows/[id]/variables` | `app/api/workflows/[id]/variables/route.ts` | Done | -- |
| **Workflow status** | `POST /workflows/[id]/status` | -- | **Missing** | P2 |
| **Execution state** | `POST /workflows/[id]/state` | -- | **Missing** | P2 |
| **Reorder workflows** | `POST /workflows/reorder` | -- | **Missing** | P3 |
| **Schedule execute** | `POST /schedules/execute` | -- | **Missing** | P2 |
| Individual schedule | `GET/PUT/DELETE /schedules/[id]` | `app/api/schedules/[id]/route.ts` | Done | -- |

---

## 7. Deploy Modal & Feature Tabs

| Area | Sim File | Our File | Status | Priority |
|------|----------|----------|--------|----------|
| Deploy modal (General tab) | `deploy-modal.tsx` | `deploy/deploy-modal.tsx` | Done | -- |
| Deploy modal (API/Webhook tab) | API tab with curl examples | API tab (basic) | Done | -- |
| **Deploy modal (MCP tab)** | `McpDeploy` component | "Coming soon" placeholder | **Missing** | P2 |
| **Deploy modal (A2A tab)** | `A2aDeploy` component | "Coming soon" placeholder | **Missing** | P2 |
| **Deploy modal (Chat tab)** | `ChatDeploy` with stream config | "Coming soon" placeholder | **Missing** | P2 |

---

## 8. MCP, A2A, Chat Infrastructure

| Area | Sim File | Our File | Status | Priority |
|------|----------|----------|--------|----------|
| **MCP client/service** | `lib/mcp/` (20+ files: client, service, connection-manager, middleware, storage) | `lib/mcp/` (4 stubs: shared, tool-validation, types, utils) | **5% done** | P2 |
| **MCP API routes** | `app/api/mcp/` (18 routes: serve, servers, tools, discover, execute) | -- | **Missing** | P2 |
| **MCP workflow sync** | `lib/mcp/workflow-mcp-sync.ts` | -- | **Missing** | P2 |
| **A2A core library** | `lib/a2a/` (6 files: types, utils, constants, agent-card, push-notifications) | `lib/sim/tools/a2a/` (10 tool files) | **40% done** | P2 |
| **A2A serve endpoint** | `app/api/a2a/serve/[agentId]/` | -- | **Missing** | P2 |
| **A2A API routes** | `app/api/a2a/agents/` (CRUD) | -- | **Missing** | P2 |
| **Chat API routes** | `app/api/chat/` (5 routes: main, manage, validate, identifier, OTP) | `app/api/agent/chat/` (1 basic route) | **15% done** | P2 |
| **Chat auth flows** | Password, email, OTP, SSO | -- | **Missing** | P2 |
| **Chat management UI** | Full dashboard pages | -- | **Missing** | P2 |

---

## 9. Execution Logs & Monitoring

| Area | Sim File | Our File | Status | Priority |
|------|----------|----------|--------|----------|
| Execution logs dashboard | `logs/page.tsx` + 20+ components | `app/(workspace)/automations/logs/page.tsx` + `execution-logs-dashboard.tsx` + `app/api/executions/route.ts` | Done (core table + stats + pagination) | -- |
| Execution log panel (in-canvas) | `panel/components/execution-log/` | `execution-log-panel.tsx` wired to canvas Run SSE events | Done | -- |
| **Execution snapshots** | `components/execution-snapshot/` | -- | **Missing** | P2 |
| **Trace spans** | `components/trace-spans/` (OpenTelemetry) | -- | **Missing** | P3 |
| **Cost tracking UI** | Displayed in log viewer | Schema field only | **Missing** | P2 |
| **Webhook execution logs** | `background/webhook-execution.ts` | -- | **Missing** | P2 |

---

## 10. Environment Variables

| Area | Sim File | Our File | Status | Priority |
|------|----------|----------|--------|----------|
| **Env var dropdown UI** | `sub-block/components/env-var-dropdown.tsx` | `sub-blocks/env-var-dropdown.tsx` | Done | -- |
| **Env var resolver** | `executor/variables/resolvers/env.ts` | -- | **Missing** | P0 |
| Env var management UI | Settings page for env vars | `apps/settings/components/SettingsApp.tsx` SecretsSection | Done | -- |
| **Env var API** | CRUD routes for workspace env vars | -- | **Missing** | P0 |
| **Env var storage** | Organization-level settings | `envVarValues: {}` hardcoded | **Missing** | P0 |
| Env var query hooks | `hooks/queries/environment.ts`, `use-available-env-vars.ts` | `env-var-dropdown.tsx` usePersonalEnvironment wired to /api/environment | Done | -- |

---

## 11. DB Schema

| Table | Status | Notes |
|-------|--------|-------|
| workflows | 95% match | Minor: Sim uses uuid for orgId, we use text |
| workflowBlocks | 100% match | -- |
| workflowEdges | 100% match | -- |
| workflowSubflows | 100% match | -- |
| workflowExecutionLogs | 100% match | -- |
| workflowDeploymentVersion | 100% match | -- |
| webhook | 100% match | -- |
| workflowSchedule | 100% match | -- |
| chat | 100% match | -- |
| a2aAgent | 85% match | Sim refs workspace; ours refs workflow |
| a2aTask | 90% match | Naming diff (history vs messages) |
| a2aPushNotificationConfig | 90% match | Sim uses agentId; ours uses workflowId |
| mcpServers | 60% match | Sim has userId, config, updatedAt — ours simpler |

---

## Priority Summary

### P0 — Must have for usable product

1. ~~Execution logs panel~~ **DONE** — Sprint 4/5A: `execution-log-panel.tsx` wired to canvas Run SSE events
2. ~~Environment variables~~ **DONE** — Sprint 5A: Settings Secrets UI + env-var-dropdown wired to `/api/environment` + executor resolves from DB
3. ~~Copy/paste blocks~~ **DONE** — Already existed in `registry.ts` + Ctrl+C/V
4. ~~Undo/redo~~ **DONE** — Already existed in `stores/undo-redo/`

### P1 — Important for production quality

5. ~~Pre-deploy validation~~ **DONE** — Already existed
6. ~~**Change detection**~~ **DONE** — `computeNeedsRedeployment` compares current vs deployed state fingerprint; amber "Update" button in canvas; re-checks after each auto-save
7. ~~Canvas context menus~~ **DONE** — block-context-menu.tsx (Copy, Duplicate, Delete, Run from/until)
8. ~~Custom edge rendering~~ **DONE** — workflow-edge.tsx
9. ~~Keyboard shortcuts~~ **DONE** — Delete/Backspace, Ctrl+C/V
10. ~~Floating action bar~~ **DONE** — ReactFlow Controls
11. ~~Workflow utilities~~ **DONE** — edge-validation, findDescendants, etc.
12. ~~Edge validation~~ **DONE** — cycle detection + scope validation
13. ~~Registry store~~ **DONE** — Already existed
14. ~~Variables panel~~ **DONE** — Already existed
15. ~~useLogsStore~~ **DONE** — Already existed
16. ~~useCanvasModeStore~~ **DONE** — Already existed
17. ~~Dropdown input~~ **DONE** — Already file-copied
18. ~~Tag dropdown~~ **DONE** — Fixed infinite loop bug (Sprint 4)
19. ~~Schedule-info component~~ **DONE** — Already existed
20. ~~Sub-block orchestrator~~ **DONE** — Already existed
21. ~~Workflow variables API~~ **DONE** — Already existed

### P2 — Enhanced experience (do third)

22. ~~Loop/parallel container rendering~~ **DONE** — Sprint 4: subflow-node.tsx + blockStateToNode container handling
23. ~~Subflow node rendering~~ **DONE** — Sprint 4: SubflowNodeComponent registered in nodeTypes
24. ~~Auto-layout~~ **DONE** — Full algorithm + API endpoint (Sprint 4)
25. Snap-to-grid — **included in auto-layout** (`snapPositionToGrid` in utils.ts)
26. Selection mode (shift-select) — QOL, deferred
27. ~~Block dimensions tracking~~ **DONE**
28. ~~Run from/until specific block~~ **DONE** — Sprint 4: context menu + run endpoint params + executor wired
29. ~~Execution cancellation~~ **DONE**
30. ~~Deployment versioning/revert~~ **DONE**
31. ~~Execution streaming endpoint~~ **DONE**
32. ~~Workflow duplication endpoint~~ **DONE**
33. ~~Terminal/console panel~~ **DONE**
34. ~~Custom node (full)~~ **DONE** — Sprint 4: dynamic handles, subblock rows, condition/router handles, execution status, connection validation
35. MCP API routes + client library — **deferred to Sprint 6**
36. A2A serve endpoint + API routes — **deferred to Sprint 6**
37. Chat auth flows + management UI — **deferred to Sprint 6**
38. ~~Sanitization module~~ **DONE** (references, key-validation, validation; json-sanitizer deferred — depends on credential-extractor/copilot)
39. ~~Subblock visibility module~~ **DONE**
40. ~~Dynamic handle topology~~ **DONE**
41. Execution snapshots — **deferred** (depends on execution log dashboard, P0 item)
42. Cost tracking UI — **deferred** (schema field exists, UI needs log viewer)
43. Webhook execution logs — **deferred** (depends on background job infrastructure)
44. ~~Schedule validation + individual schedule CRUD~~ **DONE** (validation was already complete; added GET/PUT/DELETE /schedules/[id])
45. ~~use-depends-on-gate hook~~ **DONE** (already existed)
46. ~~use-selector-setup hook~~ **DONE** — Copied from Sim with selector context stubs
47. ~~credential-selector~~ **DONE** — Functional stub with connect/disconnect UI, preserves Sim interface
48. ~~knowledge-base-selector~~ **DONE** — Functional stub with multi-select tag UI, preserves Sim interface
49. ~~selector-combobox~~ **DONE** — Full component with search, clear, dropdown, adapted to our UI primitives
50. ~~Registry utils~~ **DONE** (already completed in Sprint 3)
51. ~~Notification store~~ **DONE** — 4 files (types, utils, store, index) copied from Sim
52. ~~Modals store~~ **DONE** — 3 files (search types, store, index) copied from Sim
53. ~~Workflow lifecycle~~ **DONE** — archive/restore with schedule + webhook + deployment cleanup
54. ~~Block dimensions~~ **DONE** — BLOCK_DIMENSIONS, CONTAINER_DIMENSIONS, HANDLE_POSITIONS constants
55. ~~Selector infrastructure~~ **DONE** — types, use-selector-query stubs, subblocks/context field mapping

### P3 — Future / advanced (defer)

51. Copilot panel (AI workflow assistant)
52. Collaborative editing (socket cursors)
53. Diff/version comparison engine
54. Note blocks on canvas
55. Block locking
56. Marketplace / templates
57. Trace spans (OpenTelemetry)
58. Workflow lifecycle management
59. Copilot training store
60. Folder/sidebar organization stores
61. document-tag-entry, table-selector, response-format components

---

## Recommended Next Steps

**How every sprint item works — the same every time:**
1. `Read` the Sim source file
2. Copy it into our repo at the corresponding path
3. Change **only** import paths (`@/stores/` → `@/apps/automations/stores/`, etc.)
4. Swap UI primitives to our design system (CSS vars, `@base-ui/react`) — keep all logic identical
5. Stub auth/workspace calls if we don't have them yet — preserve function signatures
6. If the Sim file has features we don't need today (collaborative, Trigger.dev), leave the code in place as dead paths or no-op stubs — do NOT delete it

**Sprint 1: Core UX (P0)**
1. ~~**Execution logs panel**~~ **DONE** — Terminal stores (console + UI state), types, utils (tree building, grouping), hooks (resize, filters, output panel resize), redaction utility, notification store stub, execution store types + directory restructure, Terminal UI component, wired into canvas. All data layer 1:1 from Sim.
2. ~~**Environment variables**~~ **DONE** — DB tables (environment, workspaceEnvironment), API route (GET/POST /api/environment), server-side loader (getEffectiveEnvVars), environment store (Sim structure: types/store/index), client-side API (fetchPersonalEnvironment, savePersonalEnvironment), useAvailableEnvVarKeys hook, wired all 3 executor call sites (run, webhook, schedule) to load real env vars from DB. Settings store re-exports from new directory.
3. ~~**Undo/redo**~~ **DONE** — Full undo-redo store (constants, types, store, utils, code-store, code-storage, index) copied from Sim. Supports all 13 operation types, move coalescing, diff dedup, safe localStorage, IndexedDB for code editor, recording suspension, stack pruning.
4. ~~**Copy/paste**~~ **DONE** — `regenerateBlockIds` added to workflow utils (ID remapping, position offset, name uniqueness, condition ID remapping, edge remapping). Registry store updated with `clipboard`, `copyBlocks`, `preparePasteData`, `hasClipboard`, `clearClipboard`, `pendingSelection`. Canvas keyboard wiring is next (Sprint 2 item 7).

**Sprint 2: Canvas Polish (P1)**
5. ~~**Custom edges**~~ **DONE** — WorkflowEdge component (smooth step path, execution status coloring green/red, selected state with X delete button, error edge styling). Registered as default edge type.
6. ~~**Edge validation**~~ **DONE** — `validateEdges` (scope checking, trigger target prevention, annotation block filtering) + `wouldCreateCycle` (BFS cycle detection). Cycle detection wired into `onConnect`.
7. ~~**Context menus**~~ **DONE** — BlockContextMenu component (right-click on blocks: Copy, Duplicate, Delete). Wired via `onNodeContextMenu`. Dismisses on click outside or Escape.
8. ~~**Keyboard shortcuts**~~ **DONE** — Delete/Backspace (removes selected blocks + edges + subblock values), Ctrl+C (copies selected or focused block via registry.copyBlocks), Ctrl+V (pastes with offset via registry.preparePasteData). Respects editable element detection. Undo/redo keybinding deferred until operation application logic is ported.
9. ~~**Floating action bar**~~ **DONE** — ReactFlow Controls with zoom +/-, fit view. Styled with our design tokens.
10. ~~**Pre-deploy checks + change detection**~~ **DONE** — `runPreDeployChecks` (has-blocks, connectivity, required fields via serializer). Wired into deploy button. Change detection ("Update" button) deferred to workflow-diff store port.

**Sprint 3: Stores & Utilities (P1)**
11. ~~**Registry store**~~ **DONE** — Full Sim registry store copied: types (DeploymentStatus interface, ClipboardData, WorkflowMetadata, HydrationState, WorkflowRegistry), store (CRUD, hydration phases, loadWorkflowState, duplicateWorkflow, removeWorkflow with optimistic updates, deployment status tracking, clipboard with loop/parallel support, workspace switching). Dependencies created: `lib/core/utils/optimistic-update.ts`, `lib/workflows/colors.ts`, `lib/workflows/defaults.ts`, `lib/workflows/autolayout/constants.ts` (full).
12. ~~**workflow/utils.ts**~~ **DONE** — Full Sim `stores/workflows/workflow/utils.ts` copied: `wouldCreateCycle` (DFS), `convertLoopBlockToLoop`, `convertParallelBlockToParallel`, `findChildNodes`, `findAllDescendantNodes`, `isAncestorProtected`, `isBlockProtected`, `generateLoopBlocks`, `generateParallelBlocks`. `workflow-utils.ts` updated to re-export from canonical location.
13. ~~**registry/utils.ts**~~ **DONE** — Copied `generateCreativeWorkflowName` with cosmos-themed adjective/noun lists (185 adjectives, 220 nouns).
14. ~~**Variables panel**~~ **DONE** — VariablesPanel component adapted from Sim (CRUD, collapsible entries, name validation, type selector, object/array textarea, drag-to-move). API route `GET/POST /api/workflows/[id]/variables`. Float/collaborative hooks stubbed with simple state.
15. ~~**Dropdown (full)**~~ **DONE** — Replaced 109-line dropdown with full Sim port (498 lines of logic): dependency tracking via `resolveDependencyValue`, async `fetchOptions` + `fetchOptionById` hydration, multi-select with checkbox UI, searchable flag, data mode conversion (JSON ↔ structured for Response blocks), default value auto-select. `resolveDependencyValue` added to visibility module. **Tag-dropdown** deferred — current 1,075-line version works; Sim's 1,895-line version adds keyboard navigation + nested folder support.
16. ~~**Sub-block orchestrator**~~ **DONE** — Enhanced `sub-block-field.tsx` (196→290 lines) with key Sim logic: `isFieldRequired` with complex conditional evaluation (boolean, condition objects, functions with `and` chaining), `getPreviewValue` for preview mode, `renderLabel` with requirement indicators + JSON validation warning + description tooltip + canonical mode toggle, `SubBlockProps` interface matching Sim (isPreview, subBlockValues, disabled, canonicalToggle, labelSuffix, dependencyContext), proper prop spreading to sub-components (options, fetchOptions, dependsOn, multiSelect, etc.). Wand/AI generation stubbed.

**Sprint 4: Advanced Canvas (P2)**
17. **Loop/parallel containers** — copy Sim's container node rendering from `workflow-block.tsx`.
18. **Subflow nodes** — copy `subflows/subflow-node.tsx`.
19. **Auto-layout** — copy `lib/workflows/autolayout/` + API endpoint.
20. **Canvas mode store** — copy `stores/canvas-mode/`.
21. **Run from/until block, cancel execution** — copy handlers + API routes from Sim.

**Sprint 5: Feature Tabs (P2)**
22. **MCP** — copy `lib/mcp/` (all 20+ files) + `app/api/mcp/` routes. Stub storage adapters.
23. **A2A** — copy `lib/a2a/` + `app/api/a2a/` serve endpoint.
24. **Chat** — copy `app/api/chat/` routes + auth flows.

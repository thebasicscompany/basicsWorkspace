# Sim Reconciliation Gap Analysis

**Generated:** 2025-03-27
**Sim base:** `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\src\`
**Our base:** `C:\Users\aravb\desktop\code\basics\basics-workspace\`

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
| **tag-dropdown** | `sub-block/components/tag-dropdown/tag-dropdown.tsx` (1,895) | `sub-blocks/tag-dropdown.tsx` (1,075) | **Simplified** | P1 |
| env-var-dropdown | `sub-block/components/env-var-dropdown.tsx` (372) | `sub-blocks/env-var-dropdown.tsx` (387) | Done | -- |
| sub-block-input-controller | `sub-block/components/sub-block-input-controller.tsx` (163) | `sub-blocks/sub-block-input-controller.tsx` (165) | Done | -- |
| use-sub-block-value | `sub-block/hooks/use-sub-block-value.ts` (229) | `sub-blocks/hooks/use-sub-block-value.ts` (229) | Done | -- |
| use-sub-block-input | `sub-block/hooks/use-sub-block-input.ts` (596) | `sub-blocks/hooks/use-sub-block-input.ts` (596) | Done | -- |
| **use-depends-on-gate** | `sub-block/hooks/use-depends-on-gate.ts` (140+) | -- | **Missing** | P2 |
| **use-selector-setup** | `sub-block/hooks/use-selector-setup.ts` (50+) | -- | **Missing** | P2 |
| **credential-selector** | `sub-block/components/credential-selector/` (200+) | `sub-blocks/oauth-input.tsx` (24 stub) | **Missing** | P2 |
| **knowledge-base-selector** | `sub-block/components/knowledge-base-selector/` (180+) | `sub-blocks/knowledge-inputs.tsx` (100 basic) | **Simplified** | P2 |
| **schedule-info** | `sub-block/components/schedule-info/` (120+) | -- | **Missing** | P1 |
| **selector-combobox** | `sub-block/components/selector-combobox/` (200+) | -- | **Missing** | P2 |
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
| **Copy/paste blocks** | `workflow.tsx` copyBlocks/preparePasteData | -- | **Missing** | P0 |
| **Undo/redo** | `useUndoRedoStore` + WorkflowControls | -- | **Missing** | P0 |
| **Keyboard shortcuts** | Command palette, Shift+A, K, L | -- | **Missing** | P1 |
| **Canvas context menu** | `canvas-menu/canvas-menu.tsx` | -- | **Missing** | P1 |
| **Block context menu** | `block-menu/block-menu.tsx` (delete, duplicate, copy) | -- | **Missing** | P1 |
| **Custom edge rendering** | `workflow-edge/workflow-edge.tsx` (animated, labels) | Default ReactFlow edges | **Missing** | P1 |
| **Custom node (full)** | `workflow-block/workflow-block.tsx` (dynamic handles, dims, status) | `workflow-block-node.tsx` (basic) | **Simplified** | P1 |
| **Fit to view** | `fitViewToBounds` hook in WorkflowControls | -- | **Missing** | P1 |
| **Floating action bar** | `WorkflowControls` (zoom, undo, redo, fit) | -- | **Missing** | P1 |
| **Connection validation** | Cycle detection, handle validation | Basic addEdge only | **Simplified** | P1 |
| **Selection mode** | `useShiftSelectionLock`, SelectionMode | -- | **Missing** | P2 |
| **Snap-to-grid** | `useSnapToGridSize()` hook | -- | **Missing** | P2 |
| **Loop containers** | `workflow-block.tsx` type=loop rendering | -- | **Missing** | P2 |
| **Parallel containers** | `workflow-block.tsx` type=parallel rendering | -- | **Missing** | P2 |
| **Subflow nodes** | `subflows/subflow-node.tsx` | -- | **Missing** | P2 |
| **Note blocks** | `note-block/note-block.tsx` | -- | **Missing** | P3 |
| **Auto-layout** | `use-auto-layout.ts`, `lib/workflows/autolayout/` | -- | **Missing** | P2 |
| **Block locking** | `locked` property in block state | -- | **Missing** | P3 |
| **Block dimensions** | `lib/workflows/blocks/block-dimensions.ts` | -- | **Missing** | P2 |
| **Run from block** | Handler in Sim | -- | **Missing** | P2 |
| **Run until block** | Handler in Sim | -- | **Missing** | P2 |
| **Cancel execution** | Handler in Sim | -- | **Missing** | P2 |
| **Copilot panel** | `panel/components/copilot/` (full AI chat) | -- | **Missing** | P3 |
| Variables panel | `panel/components/variables.tsx` | `components/variables-panel.tsx` | Done | -- |
| **Terminal/console panel** | `terminal.tsx` | -- | **Missing** | P2 |
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
| **useUndoRedoStore** | `stores/undo-redo/` | -- | **Missing** | P0 |
| **useCanvasModeStore** | `stores/canvas-mode/` | -- | **Missing** | P1 |
| **useCopilotStore** | `stores/panel/copilot/` | -- | **Missing** | P3 |
| **useTerminalConsoleStore** | `stores/terminal/console.ts` + `store.ts` | -- | **Missing** | P2 |
| **useLogsStore** | `stores/logs/` | -- | **Missing** | P1 |
| **useNotificationStore** | `stores/notifications/` | -- | **Missing** | P2 |
| **useModalsStore** | `stores/modals/` | -- | **Missing** | P2 |
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
| **edge-validation.ts** | `stores/workflows/workflow/edge-validation.ts` | -- | **Missing** | P1 |
| registry/utils.ts | `stores/workflows/registry/utils.ts` (duplicate, import/export) | `stores/workflows/registry/utils.ts` | Done | -- |
| **comparison/** | `lib/workflows/comparison/` (compare, normalize) | -- | **Missing** | P3 |
| **autolayout/** | `lib/workflows/autolayout/` | -- | **Missing** | P2 |
| **diff/** | `lib/workflows/diff/` | -- | **Missing** | P3 |
| **sanitization/** | `lib/workflows/sanitization/` (references, JSON, keys) | -- | **Missing** | P2 |
| **streaming/** | `lib/workflows/streaming/` | -- | **Missing** | P2 |
| **subblocks/visibility** | `lib/workflows/subblocks/visibility.ts` | `lib/subblock-visibility.ts` (simplified) | **Simplified** | P2 |
| **lifecycle.ts** | `lib/workflows/lifecycle.ts` | -- | **Missing** | P2 |
| **colors.ts** | `lib/workflows/colors.ts` | -- | **Missing** | P3 |
| **dynamic-handle-topology.ts** | `lib/workflows/dynamic-handle-topology.ts` | -- | **Missing** | P2 |
| **operations/** | `lib/workflows/operations/` (deploy, import/export, socket) | -- | **Missing** | P2 |
| **schedules/validation** | `lib/workflows/schedules/validation.ts` | -- | **Missing** | P2 |

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
| **Deployment versioning/revert** | `app/api/workflows/[id]/deployments/[version]/revert/` | -- | **Missing** | P2 |
| **Execution streaming endpoint** | `app/api/workflows/[id]/executions/[id]/stream/` | -- | **Missing** | P2 |
| **Execution cancellation** | `app/api/workflows/[id]/executions/[id]/cancel/` | -- | **Missing** | P2 |
| **Workflow duplication** | `app/api/workflows/[id]/duplicate/` | -- | **Missing** | P2 |
| **Autolayout endpoint** | `app/api/workflows/[id]/autolayout/` | -- | **Missing** | P2 |
| **Paused execution management** | `app/api/workflows/[id]/paused/` | -- | **Missing** | P2 |
| **Pre-deploy checks** | `runPreDeployChecks()` | -- | **Missing** | P1 |
| **Change detection** | State hash comparison, "Update" button | -- | **Missing** | P1 |

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
| **Individual schedule** | `GET/PUT/DELETE /schedules/[id]` | -- | **Missing** | P2 |

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
| **Execution logs dashboard** | `logs/page.tsx` + 20+ components | -- | **Missing** | P0 |
| **Execution log panel (in-canvas)** | `panel/components/execution-log/` | -- | **Missing** | P0 |
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
| **Env var management UI** | Settings page for env vars | -- | **Missing** | P0 |
| **Env var API** | CRUD routes for workspace env vars | -- | **Missing** | P0 |
| **Env var storage** | Organization-level settings | `envVarValues: {}` hardcoded | **Missing** | P0 |
| **Env var query hooks** | `hooks/queries/environment.ts`, `use-available-env-vars.ts` | -- | **Missing** | P1 |

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

### P0 — Must have for usable product (do first)

1. **Execution logs panel** — Users cannot see run results; must inspect network tab
2. **Environment variables** — Resolver + storage + API + management UI; executor calls are hardcoded empty
3. **Copy/paste blocks** — Core canvas UX, users expect this
4. **Undo/redo** — Core canvas UX, users expect this (needs useUndoRedoStore)

### P1 — Important for production quality (do second)

5. **Pre-deploy validation** — `runPreDeployChecks()` prevents broken deploys
6. **Change detection** — "Update" button when workflow changed since last deploy
7. **Canvas context menus** — Right-click on canvas and blocks (delete, duplicate, copy)
8. **Custom edge rendering** — Current default edges look unfinished
9. **Keyboard shortcuts** — Delete, duplicate, select-all, zoom
10. **Floating action bar** — Zoom controls, fit-to-view, undo/redo buttons
11. **Workflow utilities** — `wouldCreateCycle`, `findDescendants`, `generateLoopBlocks` (needed for loops/parallels)
12. **Edge validation** — Prevent invalid connections
13. **Registry store completion** — Full CRUD, hydration, deployment status tracking
14. **Variables panel** — Workflow variable management in editor
15. **useLogsStore** — Store for execution log management
16. **useCanvasModeStore** — Hand/selection mode toggle
17. **Dropdown input (full)** — 109 lines vs Sim's 498; missing async fetch, dependency tracking
18. **Tag dropdown (full)** — Missing keyboard navigation, nested folder support
19. **Schedule-info component** — Display cron schedule status in trigger blocks
20. **Sub-block orchestrator** — Our 196-line version vs Sim's 1,185-line version
21. **Workflow variables API** — `POST /workflows/[id]/variables`

### P2 — Enhanced experience (do third)

22. Loop/parallel container rendering on canvas
23. Subflow node rendering
24. Auto-layout (endpoint + algorithm)
25. Snap-to-grid
26. Selection mode (shift-select)
27. Block dimensions tracking
28. Run from/until specific block
29. Execution cancellation
30. Deployment versioning/revert
31. Execution streaming endpoint
32. Workflow duplication endpoint
33. Terminal/console panel
34. Custom node improvements (status indicators, dynamic handles)
35. MCP API routes + client library
36. A2A serve endpoint + API routes
37. Chat auth flows + management UI
38. Sanitization module (references, JSON, keys)
39. Subblock visibility module
40. Dynamic handle topology
41. Execution snapshots
42. Cost tracking UI
43. Webhook execution logs
44. Schedule validation + individual schedule CRUD
45. use-depends-on-gate hook
46. use-selector-setup hook
47. credential-selector (full OAuth)
48. knowledge-base-selector (full)
49. selector-combobox
50. Registry utils (import/export)

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

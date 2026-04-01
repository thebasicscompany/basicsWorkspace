# Copilot Phase 2 — Tools, Canvas Refresh & System Prompt

Use this as your prompt in a new Claude Code chat. Read `CLAUDE.md` first for all codebase conventions.

---

## What exists (Phase 1 — complete)

The copilot infrastructure is working end-to-end:

| Layer | Files | Status |
|-------|-------|--------|
| **Edit-workflow engine** | `lib/copilot/edit-workflow/` (types, engine, operations, builders, validation, index) | Ported from Sim, build passes |
| **Workflow context** | `lib/copilot/workflow-context.ts` | loadWorkflowStateForCopilot, serializeWorkflowState, buildBlockRegistrySummary, getBlocksMetadata |
| **API route** | `app/api/copilot/route.ts` | AI SDK streamText + gateway.chat(), edit_workflow + get_blocks_metadata tools |
| **Modal UI** | `apps/automations/components/copilot-modal.tsx` | AssistantModalPrimitive, floating button, Thread component |
| **Canvas wiring** | `apps/automations/components/workflow-canvas.tsx` | CopilotModal rendered with workflowId prop |

### Key architectural decisions already made
- **AI SDK v6** with `gateway.chat()` (NOT `gateway()` — the default uses Responses API which our gateway doesn't support)
- **Gateway on Railway** (`GATEWAY_URL` env var, NO `/v1` suffix — the route appends it)
- **Model**: `basics-chat-smart-openai` (GPT-4o via gateway)
- **`stopWhen: stepCountIs(8)`** replaces the old `maxSteps` API
- **`zodSchema()` wrapper** required for tool inputSchema in AI SDK v6
- **Params normalization**: LLM sometimes puts type/name at operation level — execute function normalizes

### What was tested and works
- Auth → copilot API → gateway → OpenAI → streaming SSE response
- LLM calls get_blocks_metadata → gets full input schemas → calls edit_workflow with correct params
- Blocks persisted to DB, validated by engine

---

## What to build

### Task 1: Add all Sim copilot tools

Sim has these tool categories. We currently only have `edit_workflow` and `get_blocks_metadata`. Add the rest:

#### Workflow tools (Go backend in Sim — we implement directly in route.ts)

**Already done:**
- `edit_workflow` — modify workflow (add/edit/delete blocks, connections)
- `get_blocks_metadata` — look up block input schemas

**Need to add:**

1. **`run_workflow`** — Execute the current workflow and return results
   - Sim: `executeRunWorkflow()` in `orchestrator/tool-executor/workflow-tools/mutations.ts`
   - Our version: Call our existing `/api/workflows/[id]/run` endpoint internally, or use the executor directly from `lib/sim/executor/`
   - Returns: execution result with block outputs, success/error status
   - This is a **client-executable tool** in Sim (runs on client for interactive feedback) but we can run it server-side for now

2. **`run_block`** — Execute a single block using a snapshot from a previous execution
   - Sim: `executeRunBlock()` — takes blockId + snapshot, runs just that block
   - Lower priority — useful for debugging individual blocks

3. **`get_block_outputs`** — Get available output fields for blocks in the workflow
   - Sim: `executeGetBlockOutputs()` in `queries.ts`
   - Returns: block names, output field names, tag references (so the LLM knows what `{{BlockName.field}}` tags are available)
   - Important for the LLM to wire block outputs correctly

4. **`get_trigger_blocks`** — List all blocks that can act as triggers
   - Sim: `getTriggerBlocksServerTool` in `blocks/get-trigger-blocks.ts`
   - Returns: list of block types with trigger capability

5. **`get_execution_summary`** — Get summary of a workflow execution
   - Sim: `getExecutionSummaryServerTool` in `workflow/get-execution-summary.ts`
   - Returns: execution status, block results, timing

6. **`get_workflow_logs`** — Get execution log entries
   - Sim: `getWorkflowLogsServerTool` in `workflow/get-workflow-logs.ts`
   - Returns: recent execution logs with timestamps, status, errors

7. **`create_workflow`** — Create a new empty workflow
   - Sim: `executeCreateWorkflow()` — inserts into DB with name/description
   - Returns: new workflowId

#### Deployment tools (lower priority — add after core tools work)

8. **`deploy_workflow`** — Deploy the current workflow (makes it live for webhooks/schedules)
   - Sim has `deploy_api`, `deploy_chat`, `deploy_mcp` — we can simplify to one `deploy_workflow`
   - Uses our existing `/api/workflows/[id]/deploy` endpoint

9. **`check_deployment_status`** — Check if workflow is deployed
   - Sim: `executeCheckDeploymentStatus()`

#### Reference implementation

**Sim server tool pattern** (`lib/copilot/tools/server/base-tool.ts`):
```typescript
interface BaseServerTool<TParams = unknown, TResult = unknown> {
  name: string
  execute(params: TParams, context?: { userId: string }): Promise<TResult>
}
```

**For our AI SDK route**, each tool is defined inline in `streamText({ tools: { ... } })`. Follow the pattern of `edit_workflow` — define `inputSchema` with `zodSchema()`, implement `execute` function.

**Sim files to read for each tool's logic:**
- `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\lib\copilot\orchestrator\tool-executor\workflow-tools\mutations.ts`
- `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\lib\copilot\orchestrator\tool-executor\workflow-tools\queries.ts`
- `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\lib\copilot\tools\server\workflow\get-execution-summary.ts`
- `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\lib\copilot\tools\server\workflow\get-workflow-logs.ts`
- `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\lib\copilot\tools\server\blocks\get-blocks-metadata-tool.ts`
- `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\lib\copilot\tools\server\blocks\get-trigger-blocks.ts`

---

### Task 2: Canvas refresh after copilot changes

**The problem:** When the copilot adds blocks via `edit_workflow`, they're persisted to DB but the ReactFlow canvas doesn't update. User has to reload the page.

**How Sim does it (full flow):**

1. `edit_workflow` tool executes on server → saves to DB
2. SSE `tool_result` event arrives on client
3. Client-side handler fetches fresh state from `/api/workflows/{id}/state`
4. Calls `useWorkflowDiffStore.setProposedChanges(freshState, { skipPersist: true })`
5. `applyWorkflowStateToStores()` updates the workflow zustand store → ReactFlow re-renders
6. Blocks get `is_diff: 'new'` / `is_diff: 'edited'` markers (visual highlighting)
7. DiffControls component appears with Accept/Reject buttons
8. Accept: clears diff markers, keeps changes
9. Reject: restores baseline snapshot, reverts DB

**Key Sim files for this flow:**
- `lib/copilot/client-sse/handlers.ts` — lines 529-578, `tool_result` handler for `edit_workflow`
- `stores/workflow-diff/store.ts` — `setProposedChanges()`, `acceptChanges()`, `rejectChanges()`
- `app/workspace/[workspaceId]/w/[workflowId]/components/diff-controls/diff-controls.tsx`
- We already have `apps/automations/stores/workflow-diff.ts` (stubbed)

**Approaches for our implementation (choose one):**

#### Option A: Simple polling (easiest, ~30 min)
After copilot tool execution, the client polls or refetches workflow state.
- Add a `lastModified` timestamp to the copilot API response
- The CopilotModal listens for tool results and triggers a refetch of the workflow page
- Pros: Simple, no new infrastructure
- Cons: No diff preview, no accept/reject, page-level refresh

#### Option B: assistant-ui tool result callback (medium, ~2 hours)
The AI SDK streams `tool-output-available` events. assistant-ui can render custom UI for tool results.
- Define a `UITool` on the client that intercepts `edit_workflow` results
- When result arrives, fetch `/api/workflows/[id]` and update the workflow zustand store
- Pros: Real-time, integrates with assistant-ui
- Cons: Still no diff preview

#### Option C: Full diff system like Sim (full, ~1-2 days)
Port Sim's workflow-diff store and diff-controls.
- `useWorkflowDiffStore` with `setProposedChanges`, `acceptChanges`, `rejectChanges`
- Visual highlighting of new/edited blocks on canvas
- Accept/Reject buttons overlay
- Baseline snapshot for revert
- Pros: Best UX, matches Sim exactly
- Cons: Significant work, needs diff engine

**Recommendation:** Start with Option B (assistant-ui callback → store update), then upgrade to Option C later. Option B gives instant canvas refresh with minimal code. The key piece is:

```typescript
// In copilot-modal.tsx or a hook
// Listen for tool results from the assistant-ui runtime
// When edit_workflow completes, refetch workflow state and update store
```

The workflow store is at `apps/automations/stores/workflow.ts`. The canvas reads from this store. Updating it will trigger ReactFlow to re-render.

---

### Task 3: System prompt improvements

The system prompt is in `app/api/copilot/route.ts` (the `SYSTEM_PROMPT` constant). Current issues:

1. **Block registry is just type names** — LLM relies on `get_blocks_metadata` for every block. Could include the top 10 most common blocks inline.

2. **No workspace context** — Sim injects a WORKSPACE.md with credentials, knowledge bases, files, etc. We don't have most of this yet, but could add:
   - List of workflows in the workspace
   - Available credentials (OAuth connections)
   - Environment variables

3. **No examples** — The LLM would benefit from 2-3 example tool calls showing correct `edit_workflow` usage.

4. **Sim's system prompt is in their Go backend** (`copilot.sim.ai`) — we don't have access to the actual text. We're approximating it.

**Suggested system prompt additions:**
- Add 2-3 example edit_workflow calls (with correct params structure)
- Add inline metadata for the 5 most common blocks (agent, api, function, condition, start_trigger)
- Clarify the tag syntax with examples: `{{BlockName.content}}`, `{{BlockName.data.field}}`

---

## Architecture reference

### Current file structure
```
lib/copilot/
  edit-workflow/
    types.ts          — EditWorkflowOperation, ValidationError, SkippedItem, OperationContext
    engine.ts         — applyOperationsToWorkflowState(), topological sort, deferred connections
    operations.ts     — handleAddOperation, handleEditOperation, handleDeleteOperation, etc.
    builders.ts       — createBlockFromParams, normalizeBlockIdsInOperations, addConnectionsAsEdges
    validation.ts     — validateInputsForBlock, validateSourceHandleForBlock, condition/router handle validation
    index.ts          — barrel exports
  workflow-context.ts — loadWorkflowStateForCopilot, serializeWorkflowState, buildBlockRegistrySummary, getBlocksMetadata

app/api/copilot/
  route.ts            — POST handler with streamText, tools, persistWorkflowState

apps/automations/components/
  copilot-modal.tsx   — AssistantModalPrimitive + Thread, floating button
  workflow-canvas.tsx — renders <CopilotModal workflowId={workflowId} />
```

### Gateway setup
- `GATEWAY_URL` env var (no `/v1` suffix) — currently `https://basics-gateway-prod.up.railway.app`
- `GATEWAY_API_KEY` env var
- Route appends `/v1` when creating the OpenAI provider
- Use `gateway.chat('model-name')` NOT `gateway('model-name')` (the latter uses Responses API)

### AI SDK v6 patterns
```typescript
import { streamText, tool, zodSchema, stepCountIs } from 'ai'

// Tool definition
tools: {
  my_tool: tool({
    description: '...',
    inputSchema: zodSchema(z.object({ ... })),
    execute: async (input) => { ... },
  }),
}

// Stop condition (replaces maxSteps)
stopWhen: stepCountIs(8),

// Response
return result.toUIMessageStreamResponse()
```

### DB schema for workflows
- `workflowBlocks` — id, workflowId, type, name, positionX/Y, subBlocks (jsonb), outputs (jsonb), data (jsonb)
- `workflowEdges` — id, workflowId, sourceBlockId, targetBlockId, sourceHandle, targetHandle
- `workflows` — id, orgId, userId, name, isDeployed, variables, etc.

### Key existing files to understand
- `apps/automations/stores/workflow.ts` — main workflow zustand store (canvas reads from this)
- `apps/automations/stores/subblock.ts` — subblock value store
- `apps/automations/stores/registry.ts` — activeWorkflowId, deployment status
- `lib/sim/executor/` — workflow execution engine
- `lib/sim/blocks/registry.ts` — getBlock(), getAllBlocks()
- `app/api/workflows/[id]/run/route.ts` — existing run endpoint

---

## Do NOT
- Call the gateway directly from the client — always go through our API route
- Use `gateway('model')` — always use `gateway.chat('model')` (Responses API not supported)
- Put `/v1` in the GATEWAY_URL env var — the route adds it
- Rewrite the edit-workflow engine — it's ported from Sim and works
- Add WebSocket infrastructure for canvas refresh — use the assistant-ui tool result pattern instead

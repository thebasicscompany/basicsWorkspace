# Executor E2E Test Results — 2026-03-31

## Test Environment
- Dev server: localhost:3000 (Next.js)
- Gateway: basics-gateway-prod.up.railway.app (Railway)
- Database: PostgreSQL via Docker (port 5435)
- Auth: admin@example.com / admin123

---

## Test Results Summary

### Single/Simple Flows

| # | Test | Block Types | Result | Notes |
|---|------|-------------|--------|-------|
| 1 | Start → Function | starter, function | PASS | Function returned `{echo: "webhook-received", ts: ...}` |
| 2 | Start → Agent | starter, agent | PASS | Gateway → GPT-4o, answered "4" to "What is 2+2?" |
| 3 | Start → API | starter, api | PASS | GET jsonplaceholder.typicode.com/todos/1, got 200 with JSON data |

### Multi-Block Chains (tag references)

| # | Test | Blocks | Result | Notes |
|---|------|--------|--------|-------|
| 4 | Start → API → Function (tag ref) | 3 | PASS | `<Fetch Todo.data>` resolved, function processed API output |
| 5 | Start → Function → Condition → True/False | 5 | PASS | `42 > 40` evaluated, routed to True Branch, False skipped |
| 6 | Start → API → Agent (tag ref) | 3 | PASS | `<Fetch Data.data>` resolved in agent message, summarized todo |
| 7 | Start → API → Function → Agent → Function | 5 | PASS | 5-block pipeline: API fetch → extract → LLM bio → format. Tags resolved across 3+ hops. Final block refs both Agent AND API from 3 blocks back |

### Complex Patterns

| # | Test | Pattern | Result | Notes |
|---|------|---------|--------|-------|
| 8 | Router V2 Block | LLM-based routing | PASS | Gateway migration done. LLM selected "email" route for email task, correctly routed to Email Handler. Calendar/General handlers skipped. |
| 9 | Evaluator Block | LLM-based evaluation | PASS | Gateway migration done. Agent wrote essay, evaluator scored clarity=9, accuracy=10 via structured JSON output. |
| 10 | Fan-In (2 parallel APIs → merge) | DAG fan-in | PASS | Two API calls ran, function merged both outputs (`<Fetch Post.data>` + `<Fetch Comments.data>`) |
| 11 | Response Block | HTTP response | PASS | Correctly passed upstream data as response body with status 200 + headers. Note: subblock IDs must be `data`/`status`/`headers` (not `body`/`statusCode`) |
| 12 | Diamond (branch + reconverge) | 6-block conditional | PASS | Condition branched to AI path, skipped static path, merge function pulled from AI Response output even though Static Response didn't execute |
| 13 | Deep nested tags + multi-upstream | 4-block pipeline | PASS | `<Block.result.metadata.subject>` (3-level deep), array values, and referencing 2 different upstream blocks all work |

### Execution Snapshots & Run-From-Block

| # | Test | Pattern | Result | Notes |
|---|------|---------|--------|-------|
| 14 | Snapshot storage | Start → Function | PASS | `execution_state` column populated with 1.4KB snapshot (10 top-level keys: blockStates, executedBlocks, blockLogs, decisions, etc.) |
| 15 | Run-from-block (simple) | Re-execute Function only | PASS | Only Function block executed, Start block skipped (output cached from snapshot). New timestamp confirms re-execution. |
| 16 | Run-from-block (with tags) | Start → API → Function, re-execute Function | PASS | Only Function re-executed, `<Fetch Data.data>` resolved from cached API snapshot. No HTTP request made. |

**All 16 tests passed.** Router/evaluator now use the gateway. Execution snapshots stored and used for run-from-block.

---

## Critical Findings

### 1. CRITICAL BUG: Copilot system prompt uses wrong tag syntax

**The copilot tells the LLM to use `{{BlockName.field}}` but the executor uses `<BlockName.field>`.**

- File: `app/api/copilot/route.ts` line 36
- System prompt says: "Use the tag syntax: `{{BlockName.outputField}}`"
- Executor resolves: `<BlockName.field>` (angle brackets)
- `{{VAR}}` syntax is reserved for environment variables only

**Impact:** Every workflow the copilot builds with inter-block references will **fail at execution** because the tags won't be resolved.

**Fix:** Change the copilot system prompt to use `<BlockName.field>` syntax. Also update any examples in the prompt.

### 2. Condition block edge handle format

Condition blocks route via `condition-{conditionId}` source handles (e.g., `condition-cond1`), NOT `condition-true`/`condition-false`. The copilot's `edit_workflow` engine must generate correct edge handles when wiring condition blocks.

- Constants: `EDGE.CONDITION_PREFIX = 'condition-'` (in `lib/sim/executor/constants.ts`)
- Each condition has an `id` field — the edge sourceHandle must be `condition-{id}`
- For "else" branches, the condition id is typically `else` → sourceHandle = `condition-else`

### 3. Execution log format differs from Sim

Our `executionData` stores a flat array of BlockLog objects:
```json
[
  { "blockId": "...", "blockName": "Start", "blockType": "starter",
    "input": {...}, "output": {...}, "success": true,
    "startedAt": "...", "endedAt": "...", "durationMs": 1.2, "executionOrder": 1 },
  ...
]
```

Sim stores differently:
- Uses `workflowExecutionSnapshots` table with `stateData` JSONB
- Execution log has `lastStartedBlock`/`lastCompletedBlock` markers
- Separate `cost` JSONB field (tokens, model costs)
- Trace spans built from block logs for telemetry

**Impact on copilot tools:**
- `get_execution_summary` and `get_workflow_logs` must parse OUR format, not Sim's
- Cost tracking is not captured in our logs yet (tokens, model costs from agent blocks are in block output but not aggregated)
- No snapshot-based resume capability (Sim uses snapshots for run-from-block)

### 4. Unit tests all fail due to missing `@sim/testing` package

All ported executor/serializer tests import from `@sim/testing` (Sim monorepo's test utilities). This package doesn't exist in our repo.

- 27 test suites fail in executor/
- 6 test suites fail in serializer/
- Only `reference.test.ts` passes (28 tests) — it doesn't need `@sim/testing`

**Recommendation:** Create a minimal `@sim/testing` shim or rewrite test imports to local factories.

---

## What Works E2E

### Block types verified (8 of 14 handlers)
- **starter** — basic entry point, always works
- **function** — JS code execution, variable resolution, block data access
- **agent** — LLM call via gateway (GPT-4o), system/user messages, model selection
- **api** — HTTP GET with URL, method, returns data/status/headers
- **condition** — expression evaluation, branch routing with correct edge handles
- **response** — HTTP response formatting with data/status/headers
- **generic** — fallback handler (implicit — handles any unrecognized block)
- **trigger** — start block resolution (tested as `starter` type)

### Block types NOT verified (need work or infrastructure)
- **router (legacy)** — not tested (legacy mode, hidden from toolbar)
- **loop** — not tested (needs loop subflow infrastructure)
- **parallel** — not tested (needs parallel subflow infrastructure)
- **wait** — not tested (introduces delay, needs timeout handling)
- **workflow** — not tested (child workflow execution, needs deployed workflow)
- **human_in_the_loop** — not tested (pause/resume, needs SSE infrastructure)
- **mothership** — not tested (special integration)
- **variables** — not tested (workflow variable blocks)

### Execution snapshot system verified
- **Snapshot storage** — `execution_state` jsonb column on `workflowExecutionLogs`, populated after every run
- **Run-from-block** — queries latest successful snapshot, passes to `executor.executeFromBlock()`, only dirty blocks re-execute
- **Tag resolution from cache** — `<BlockName.field>` tags resolve from snapshot state, no upstream re-execution

### Variable resolution verified
- `<BlockName.field>` — angle bracket tag resolution works correctly
- Tags resolve to actual objects (not strings) in function blocks
- Tags resolve to string interpolation in agent message content
- Nested field access works: `<BlockName.result.value>` and `<BlockName.result.metadata.subject>` (3 levels deep)
- Array values resolve correctly: `<BlockName.result.scores>` → `[85, 92, 78]`
- Multi-upstream references: a block can ref 2+ different upstream blocks simultaneously
- Non-executed block refs: if a branch wasn't taken, referencing it returns undefined (handled gracefully)

### Execution patterns verified
- **Linear chains** — up to 5 blocks in sequence
- **Fan-out** — Start → two parallel API calls
- **Fan-in** — two blocks merging into one downstream block
- **Conditional branching** — condition → true/false paths with correct edge routing
- **Diamond** — branch, execute one path, reconverge to merge block (6 blocks)
- **Cross-chain references** — function referencing blocks 3+ hops upstream

### Execution pipeline verified
- Serializer correctly converts DB blocks → executor format
- DAG builder creates correct execution order from edges
- Blocks execute in topological order
- SSE streaming works (start → block:complete → complete events)
- Execution logs written to DB with block-level detail
- Workflow run count and lastRunAt updated after execution

---

## What Needs Work Before Copilot

### Must fix before copilot
1. **Fix copilot system prompt tag syntax** (`{{}}` → `<>`) — every copilot-built workflow with inter-block refs will fail
2. **Copilot edit_workflow engine must emit correct condition/router edge handles** — `condition-{conditionId}`, `router-{routeId}`

### Should fix
3. **Response block subblock IDs** — must be `data`/`dataMode`/`status`/`headers` (not `body`/`statusCode`). Copilot must use correct IDs.
4. **Aggregate cost tracking in execution logs** — add token/cost aggregation like Sim
5. **Create `@sim/testing` shim** so unit tests can run
6. **Test loop/parallel blocks** — subflow execution not yet verified

### Completed
- ~~Router + Evaluator blocks call `/api/providers`~~ — **FIXED**: Now use `executeProviderRequest()` through gateway
- ~~No execution snapshots~~ — **FIXED**: `execution_state` stored in DB, `runFromBlockId` uses snapshots

### For copilot tools specifically
7. **`get_execution_summary`** — must parse our flat BlockLog array format (not Sim's snapshot format)
8. **`get_workflow_logs`** — same format adaptation needed
9. **`get_block_outputs`** — needs to return correct tag syntax (`<BlockName.field>`)
10. **`run_workflow`** — can call our existing run endpoint, format matches

---

## Reference: Tag Syntax

| Context | Syntax | Example |
|---------|--------|---------|
| Block output reference | `<BlockName.field>` | `<Fetch Data.data.title>` |
| Environment variable | `{{VAR_NAME}}` | `{{API_KEY}}` |
| Loop context | `<loop.index>`, `<loop.item>` | `<loop.item.name>` |
| Parallel context | `<parallel.index>`, `<parallel.currentItem>` | `<parallel.currentItem>` |
| Workflow variable | `<variable.name>` | `<variable.api_base_url>` |

## Reference: Block Output Schemas

| Block Type | Key Output Fields |
|------------|------------------|
| starter | `input` |
| function | `result`, `stdout` |
| agent | `content`, `model`, `tokens`, `toolCalls`, `providerTiming` |
| api | `data`, `status`, `headers` |
| condition | `conditionResult` (bool), `selectedPath` (object), `selectedOption` (string) |
| response | `data` (any), `status` (number), `headers` (Record) |
| router | `selectedRoute` (string), `selectedPath` (object), `model`, `tokens`, `cost`, `reasoning` (v2 only) |

## Architecture: Provider Calls (RESOLVED)

All LLM-calling blocks now use the same path:

**Handler → `executeProviderRequest()` → `callGateway()` → external gateway → provider**

- Agent blocks: already used this path
- Router blocks: migrated from `fetch(/api/providers)` → `executeProviderRequest()`
- Evaluator blocks: migrated from `fetch(/api/providers)` → `executeProviderRequest()`

# Automations Engine — Baseline Test Results

**Date:** 2026-03-29
**Tested by:** CLI (curl-based API tests)
**Environment:** localhost:3000 (Next.js 16) + localhost:3002 (gateway)

---

## Summary

| Test | Status | Notes |
|------|--------|-------|
| Auth + CRUD | PASS | Create, update, read, delete workflows |
| Block + Edge persistence | PASS | Blocks and edges save/reload correctly |
| Start -> Function | PASS | SSE stream, block:complete events, execution logs |
| Multi-step chain (Start -> Func A -> Func B) | PASS | Data flows via `context.blockData` — Func B reads Func A's output |
| Agent block (LLM via gateway) | PASS | gpt-4o-mini returned response, tokens tracked |
| Agent -> Function chain | PASS | Agent output accessible in Function via `context.blockData` |
| API block (HTTP GET) | PASS (after fix) | `headers.toRecord()` bug fixed — now works |
| Condition block (true branch) | PASS (after fix) | Correctly routes to TrueBranch when condition=true |
| Condition block (false/else branch) | PASS (after fix) | Correctly routes to FalseBranch when condition=false |
| Deploy | PASS | Deploy, change detection, undeploy all correct |
| Execution logs (per-workflow) | PASS | Correct count, status, duration, trigger type |
| Execution logs (org-wide) | PASS | Pagination, status filtering work |
| Workflow delete | PASS | 204 responses, clean removal |

---

## Bug Found + Fixed

### `headers.toRecord()` not a function (API block)

**File:** `lib/sim/tools/index.ts:1258`
**Issue:** The API block handler used `secureResponse.headers.toRecord()` which is an undici-specific method not available in Node.js 24's standard fetch Headers.
**Fix:** Replaced with `headers.forEach()` iteration to build a plain object.
**Impact:** All API block executions were broken. Now works.

---

### Condition block: `params.conditions` array not resolved (variable resolver)

**File:** `lib/sim/executor/variables/resolver.ts:50-84`
**Issue:** The variable resolver had a special path for condition blocks that only handled `params.conditions` when it was a JSON **string**. When conditions arrived as an already-parsed array (which happens in our API flow since `subBlock.value` is stored as JSONB), the resolver skipped setting `resolved.conditions` entirely, then also skipped it in the normal loop (line 87-89). Result: the handler received `inputs.conditions = undefined` and returned `conditionResult: false`.
**Fix:** Added an `else if (Array.isArray(params.conditions))` branch so pre-parsed arrays get the same template resolution treatment as parsed strings.
**Impact:** All condition block executions were silently broken — conditions always returned false.

---

## Key Findings

### What works end-to-end via API
1. **Workflow CRUD** — create, list, update (blocks + edges), delete
2. **Function blocks** — JS code execution with `fetch`, `console`, `env`, `context` globals
3. **Data flow between blocks** — upstream block outputs available via `context.blockData[blockId]`
4. **Agent blocks** — LLM calls route through gateway, return content + model + token counts
5. **API blocks** — arbitrary HTTP requests with method, headers, body, query params
6. **Deploy/undeploy** — fingerprint-based change detection correctly flags edits
7. **Execution logging** — per-workflow and org-wide, with status filtering and pagination
8. **SSE streaming** — `start`, `block:complete`, `complete`/`error` events stream correctly

### What needs attention
1. **Gateway stability** — gateway process crashed twice during testing (possibly related to its DB connection pool). Need to investigate gateway's process management.
2. **Port hardcoding** — `getBaseUrl()` returns `http://localhost:3000` hardcoded. If the app runs on a different port (e.g., 3001 when 3000 is occupied), all internal tool HTTP calls (`/api/function/execute`) break silently with "Not Found". Consider using `NEXTAUTH_URL` or `BETTER_AUTH_URL` env var.
3. **Function block `input` variable** — the code sandbox only exposes `fetch`, `console`, `env`, `context`. There is no `input` variable. The existing e2e-test.sh uses `JSON.stringify(input)` which would fail. Users need to use `context.blockData` to access upstream outputs.

---

## What Needs UI Testing (for your engineers)

### Canvas interactions (critical path)
- [ ] Add a block from the toolbar -> appears on canvas -> persists on reload
- [ ] Connect two blocks with an edge -> edge persists on reload
- [ ] Delete a block (select + Backspace) -> deleted on reload
- [ ] Right-click block context menu: Copy, Duplicate, Delete, Run from here, Run until here
- [ ] Drag to reposition blocks -> position persists on reload

### Block editor panel
- [ ] Click a block -> editor panel opens on the right
- [ ] Edit sub-block values (text, dropdown, code) -> auto-saves on debounce
- [ ] Tag dropdown: type `<` in a text input -> shows available block outputs
- [ ] Env var dropdown: type `{{` in a text input -> shows saved secrets

### Execution in canvas
- [ ] Click Run (play button) on a Start -> Agent workflow -> execution log panel shows SSE events in real-time
- [ ] Run from here (right-click Agent -> Run from here) -> only that block and downstream execute
- [ ] Run until here (right-click Start -> Run until here) -> only that block executes
- [ ] Error display: run a workflow with bad code -> error shows in log panel

### Deploy flow in canvas
- [ ] Click Deploy button -> deployed badge appears on the workflow
- [ ] Edit a block after deploy -> amber "Update" button appears (change detection)
- [ ] Click Update -> re-deploys, button goes back to normal
- [ ] Undeploy -> badge disappears

### Settings
- [ ] Settings -> Secrets -> add a key/value pair -> save -> reload -> persists
- [ ] In automations text input, type `{{` -> env var dropdown shows the saved secret

### Shop / OAuth
- [ ] Navigate to Shop page -> provider tiles render with icons
- [ ] Category filter tabs work
- [ ] Click Connect on a provider -> redirects to gateway OAuth (requires gateway running)
- [ ] After OAuth -> credential appears in block's credential selector dropdown

### Automations list page
- [ ] Create new workflow -> appears in list
- [ ] Three-dot menu -> Rename -> enter new name -> persists on reload
- [ ] Three-dot menu -> Delete -> confirm -> workflow removed
- [ ] Logs button -> navigates to `/automations/logs` dashboard
- [ ] Logs dashboard: stats cards, status filter tabs, paginated table, row expand for block detail

### Credential selector (in block editor)
- [ ] For blocks requiring OAuth (e.g., Slack, GitHub) -> credential dropdown shows connected accounts
- [ ] If no accounts -> "Connect" button redirects to OAuth flow
- [ ] Auto-selects single connection when only one exists

---

## Workflows Not Tested (need external services)

| Workflow | Blocker |
|----------|---------|
| Web Search -> Agent summarize | Needs DuckDuckGo/Tavily/Perplexity API key in secrets |
| Slack send message | Needs Slack OAuth connection via Shop |
| GitHub create issue | Needs GitHub OAuth connection via Shop |
| Webhook trigger | Trigger runtime not yet built (Phase 3E) |
| Scheduled trigger | Cron infrastructure not yet built (Phase 3E) |
| Condition branching (complex expressions) | Tested with simple true/false — complex expressions referencing block outputs need UI testing |
| Router block | Similar to condition, needs UI for multi-path setup |
| Loop/Parallel containers | Subflow rendering + execution needs UI testing |

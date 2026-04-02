# Basics OS — Product Audit (April 2026)

## What's Strong

- **Automations engine is real.** 180+ blocks, full DAG executor, ReactFlow canvas, SSE streaming, execution logs. Not a demo.
- **Context layer is the moat.** Records, events, relationships, pgvector embeddings — all four layers live and indexed. Most competitors skip shared context entirely.
- **Workspace primitive works.** App registry, org-scoped multi-tenancy, OAuth shop (15+ providers), CRM, agent chat with workspace-aware tools.

---

## Misalignments Between Pitch and Product

### 1. The headline feature doesn't exist

> "Hit record, walk through your workflow, and the agent watches, asks questions, and builds the automation in real time."

Zero observation/recording infrastructure in the codebase. No screen capture, no action logging, no workflow inference. The copilot can edit workflows via chat, but that's "tell it what to build," not "show it what you do." This is the core differentiator and the hardest thing to build.

**Either narrow the near-term pitch to what exists (visual builder + AI copilot + shared context), or make the record-and-watch agent the singular engineering priority.**

### 2. Building breadth when depth is needed

9+ apps (CRM, Tasks, Notes, Meetings, Objects, Context, Agent, Shop, Settings, Automations). None are best-in-class. Meanwhile the core differentiator (graduated autonomy) doesn't exist.

**Risk:** Ship a mediocre Notion + mediocre Pipedrive + mediocre Zapier and nobody switches. Breadth only matters once the automation layer is so good people *need* everything in one place.

**Recommendation:** Freeze new app development. Make automations + agent observation so good people tolerate a basic CRM.

### 3. The "graduated handoff" has no runtime

The trigger runtime (Phase 4) isn't done. Workflows only run manually — no webhooks, no schedules, no event-driven triggers. Schema and queuing are ready but the worker isn't running. Without deploy + triggers, there's no autonomy at all.

### 4. Custom tool building is developer-only

Adding a new block requires TypeScript in `lib/sim/blocks/` and a redeploy. No runtime plugin system, no user-facing block builder, no one-click deploy. The "anyone can build tools with Claude Code" pitch only works if the target user is a developer running Claude Code against the repo.

---

## Competitor Blind Spots

### Missing from the analysis

| Competitor | Why it matters |
|---|---|
| **n8n** | Open-source, 400+ integrations, self-hostable, visual builder, AI agent nodes. Closest actual comp. Massive community. |
| **Activepieces** | Open-source Zapier alternative, growing fast, MIT licensed |
| **Windmill** | Open-source, code-first workflows, self-hostable |
| **Langflow / Flowise** | Open-source AI workflow builders |

The pitch positions against Rippling and Cowork, but the actual product competes with n8n. **The "workspace + context" angle is the separator — lean into it harder.**

### On the Anthropic defense

The logic is solid but practically irrelevant. Anthropic won't build this, but they'll enable 50 startups to. The moat isn't "Anthropic won't compete" — it's "we have the context layer and the graduated autonomy loop."

---

## Priorities (in order)

1. **Finish the trigger runtime (Phase 4).** Without it, nothing runs autonomously. Weeks away — schema, queuing, and endpoints are stubbed. Just wire the worker.

2. **Build the observation/recording agent.** Even a V1 that watches `context_events` and suggests "I noticed you do X every Monday, want me to automate it?" validates the entire thesis. This is where you win or lose.

3. **Onboarding flow.** Nobody will understand what this product does without guided first experience. Workspace naming → connect first tool → sample automation.

4. **Stop building new apps.** CRM, tasks, notes are good enough. Every hour on them is an hour not spent on the differentiator.

5. **Billing can wait** until there are users who want to pay.

---

## Bottom Line

Technical execution is strong — automations engine, context layer, and workspace shell are real. But the pitch sells a product 2-3 phases ahead of what's built. The "record and watch" agent is the entire company thesis and it's not started.

The context layer is the right foundation for it. Most teams trying to build this don't have the shared data model that already exists here. But the priority must shift from going wide (more apps, more blocks, more integrations) to going deep on the one thing that makes this not-n8n: **the agent that watches, learns, and gradually takes over.**

---

## Security & Code Quality Audit

Full codebase audit covering API routes, Electron recorder, client-side code, and tool integrations.

### CRITICAL — fix immediately

#### 1. Unauthenticated Remote Code Execution
- **Location:** `app/api/function/execute/route.ts:168` + `proxy.ts:3`
- `/api/function` is listed in `PUBLIC_PATHS`, meaning it requires **zero authentication**. The endpoint uses `new AsyncFunction()` to execute user-supplied JavaScript in the Node.js server process. An attacker can access `process.env`, read the filesystem, make network requests, or run system commands. This is trivially exploitable from the public internet.

#### 2. 250+ tool routes are unauthenticated
- **Location:** `proxy.ts:3`
- `/api/tools` is in `PUBLIC_PATHS`, bypassing the auth guard for **all 258 route files** under `app/api/tools/`. These routes interact with SFTP, PostgreSQL, MySQL, Redis, Slack, OneDrive, Outlook, Microsoft Teams, and more. Only ~8 of 258 routes have their own auth checks. An attacker can proxy connections to arbitrary databases and services.

#### 3. Condition handler allows arbitrary code execution
- **Location:** `lib/sim/executor/handlers/condition/condition-handler.ts:33`
- User-supplied `conditionExpression` is interpolated directly into `return Boolean(${conditionExpression})` and executed via the function execute endpoint. Any authenticated user can run arbitrary server-side code through a Condition block.

#### 4. PowerShell command injection in Electron recorder
- **Location:** `electron/recorder/accessibility.ts:30-66`
- `x` and `y` values are interpolated directly into a PowerShell script string via template literal with no sanitization. The `getElementAtPoint` function is exported and accepts arbitrary arguments. If non-numeric values are ever passed, arbitrary PowerShell commands execute.

### HIGH — fix before any deployment

#### 5. IDOR on agent chat threads
- **Location:** `app/api/agent/chat/route.ts:39-79`
- Thread history is loaded and messages are written without verifying the thread belongs to the requesting user's org. Any authenticated user can read/write to any other user's chat thread by supplying an arbitrary `threadId`.

#### 6. Settings API leaks gateway API key to browser
- **Location:** `app/api/settings/route.ts:41`
- The GET handler returns `gatewayApiKey` directly in the JSON response. This server-side secret (used for gateway authentication) is exposed to any authenticated user.

#### 7. Gateway path traversal via `provider` parameter
- **Location:** `app/api/connections/[provider]/route.ts:17`
- The `provider` URL parameter is interpolated directly into the gateway URL with no validation or encoding. A payload like `../../../admin/secrets` could reach unintended gateway endpoints.

#### 8. Open redirect in OAuth flow
- **Location:** `app/api/connections/[provider]/authorize/route.ts:19`
- The `redirect_after` query parameter is forwarded to the gateway's authorize URL without validating the domain. An attacker can supply `redirect_after=https://evil.com` to create a phishing vector.

#### 9. Cron authentication bypass via spoofable Host header
- **Location:** `app/api/cron/schedules/route.ts:17-31`
- When `CRON_SECRET` is not set, the auth check falls back to verifying the `Host` header starts with `localhost` or `127.0.0.1`. The `Host` header is trivially spoofable by any HTTP client.

#### 10. PostgreSQL unsafe query execution
- **Location:** `app/api/tools/postgresql/utils.ts:41`
- `sql.unsafe(query, params)` bypasses the postgres library's built-in SQL injection protections. The `validateQuery` function only checks the first word of the query via regex. Multi-statement attacks like `SELECT 1; DROP TABLE users --` can bypass validation.

#### 11. Neo4j Cypher query injection
- **Location:** `app/api/tools/neo4j/utils.ts:39-56`
- `validateCypherQuery` only checks that the query is a non-empty string. No blocklist of dangerous operations. APOC procedures can make outbound HTTP requests (SSRF) or read files from the Neo4j server filesystem.

#### 12. No sandbox on any Electron BrowserWindow
- **Location:** `electron/window.ts:22`, `electron/recorder/overlay-window.ts:26`
- Neither the main window nor overlay enables `sandbox: true` in webPreferences. Renderer compromise gives full Node.js access.

#### 13. Path traversal via unsanitized sessionId in Electron
- **Location:** `electron/recorder/capture.ts:13-16`
- `sessionId` from IPC is joined directly into a file path via `path.join(os.tmpdir(), "basics-recordings", sessionId)`. A malicious renderer could pass `../../etc/something` to create directories outside the intended location.

#### 14. Clipboard exfiltration without consent
- **Location:** `electron/recorder/hooks.ts:153-163`
- The clipboard is polled every second, and the full text is captured verbatim as a `CapturedEvent` — including passwords, tokens, API keys. No filtering, truncation, or opt-in consent mechanism.

#### 15. Server secrets missing `server-only` guard
- **Location:** `lib/core/config/env.ts:1-18`
- All sensitive env vars (`DATABASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) are exported from a plain module with no `import "server-only"` guard. If any client component imports this, all secrets ship to the browser.

#### 16. Image proxy with wildcard CORS and no auth
- **Location:** `app/api/tools/image/route.ts:73, 91-94`
- Sets `Access-Control-Allow-Origin: *` and is unauthenticated (under `/api/tools`). Usable as an open proxy for image fetching by any origin.

### MEDIUM

#### 17. No CSRF protection on custom API routes
- **Location:** Multiple routes
- Custom routes (workflows, copilot, agent chat) rely solely on cookie-based session auth with no CSRF tokens. Vulnerable unless browser SameSite cookie policy is sufficient.

#### 18. SFTP host not validated for SSRF
- **Location:** `app/api/tools/sftp/utils.ts:94-149`
- No `validateDatabaseHost` call on the `host` parameter. Internal IPs (169.254.169.254 for cloud metadata, internal services) are reachable.

#### 19. SFTP double-encoding path traversal
- **Location:** `app/api/tools/sftp/utils.ts:171-179`
- URI decode after null-byte removal doesn't re-check for `../` sequences. Double-encoded payloads like `%252e%252e%252f` survive the first decode.

#### 20. Records JSONB merge without field validation
- **Location:** `app/api/records/[id]/route.ts:53`
- The entire request body is merged into the record's JSONB data column via `||`. No schema validation or field-level access control. Protected/computed fields can be overwritten.

#### 21. Internal API secret fallback
- **Location:** `lib/auth/internal.ts:12`
- `INTERNAL_API_SECRET` falls back to `BETTER_AUTH_SECRET`. A single secret compromise breaks both user auth and internal service-to-service calls.

#### 22. Function execute timeout doesn't kill sync CPU work
- **Location:** `app/api/function/execute/route.ts:172`
- The `Promise.race` timeout can't interrupt event-loop-blocking code. A tight synchronous loop blocks the event loop and the timeout never fires. CPU DoS is possible.

#### 23. No rate limiting on webhook endpoint
- **Location:** `app/api/webhooks/trigger/[path]/route.ts:35`
- Unauthenticated by design (external services call it), but has no rate limiting. Each POST triggers a workflow execution, enabling resource exhaustion.

#### 24. Unbounded event buffer in Electron recorder
- **Location:** `electron/recorder/buffer.ts:1-19`
- The events array grows without any size limit. Long recording sessions lead to memory exhaustion. No max count, no eviction policy.

#### 25. Global input hooks capture all apps system-wide
- **Location:** `electron/recorder/hooks.ts:178-181`
- uIOhook captures clicks, keys, and scrolls from every application, not just Basics. Privacy concern — users may not expect system-wide monitoring.

#### 26. SQL query validation is first-word-only
- **Location:** `app/api/tools/rds/utils.ts:82-94`, `app/api/tools/mysql/utils.ts:60-73`, `app/api/tools/postgresql/utils.ts:49-62`
- All three `validateQuery` functions only regex-check the first keyword. Stacked queries, subqueries with DDL, `INSERT INTO ... SELECT` for data exfiltration, and `DELETE` without `WHERE` all bypass validation.

### LOW

#### 27. Hardcoded seed credentials
- **Location:** `scripts/seed.ts:6`
- `admin@example.com` / `admin123` hardcoded in multiple scripts. Risk if seed runs in production.

#### 28. 65 files with `@ts-nocheck`
- **Location:** Various (including production component `apps/automations/components/sub-blocks/tool-input.tsx`)
- Type-checking completely disabled in 65 files. Most are ported Sim files but one is a production UI component.

#### 29. Error messages leak internal details
- **Location:** Multiple API routes (`function/execute`, `cron/schedules`, `environment`, `deploy`)
- Raw `error.message` returned to clients. Could reveal file paths, stack traces, or database errors.

#### 30. Source maps shipped in Electron dist
- **Location:** `electron/dist/recorder/*.js.map`
- Full TypeScript source exposed in production builds. Makes reverse engineering trivial.

#### 31. No request body size validation
- **Location:** Copilot, agent chat, function execute endpoints
- No max payload size enforced. Large payloads cause memory pressure and expensive LLM calls.

#### 32. Gateway API key fallback to empty string
- **Location:** `app/api/copilot/route.ts:28`, `app/api/agent/chat/route.ts:13`, `app/api/context/ask/route.ts:8`
- `process.env.GATEWAY_API_KEY ?? ""` — if env var is missing, requests are sent with an empty key instead of failing fast.

---

### Priority Actions

**Immediate (before any public exposure):**
1. Remove `/api/function` and `/api/tools` from `PUBLIC_PATHS` in `proxy.ts` — closes findings #1 and #2
2. Add auth checks to `/api/function/execute/route.ts`
3. Sanitize `conditionExpression` in the condition handler — whitelist comparisons, not arbitrary JS

**Before beta:**
4. Fix the IDOR on agent chat threads — add org ownership check
5. Stop returning `gatewayApiKey` in the settings response
6. Validate `provider` param and `redirect_after` URL in connection routes
7. Add `import "server-only"` to `lib/core/config/env.ts`
8. Set `CRON_SECRET` as required (not optional) and remove Host header fallback
9. Add rate limiting to webhook and function execute endpoints

**Electron-specific:**
10. Validate `sessionId` format (UUID only) before using in file paths
11. Sanitize PowerShell inputs or validate numeric types at runtime
12. Add consent/filtering to clipboard capture
13. Enable `sandbox: true` on all BrowserWindows

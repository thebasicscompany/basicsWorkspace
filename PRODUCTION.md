# Production Readiness Tracker

Things that work in dev but need changes before shipping as an Electron app / hosted service.

---

## Must Move to Gateway

### Schedule Worker (PgBoss)
- **Current:** `lib/schedules/worker.ts` runs inside Next.js process
- **Problem:** If user closes the Electron app, scheduled workflows stop firing
- **Fix:** Move the PgBoss worker into the gateway (`basicsAdmin`). Add a `/v1/execute/workflow` route that accepts `{ workflowId, triggerPayload }`, loads the workflow from the shared DB, and runs the executor. The schedule worker calls this route when a cron job is due.
- **Files to move:** `lib/schedules/worker.ts` → `packages/gateway/src/jobs/schedule-worker.ts`
- **Gateway needs:** Access to the same Postgres, the Sim executor (or a workflow execution endpoint to call)

### Webhook Receive Endpoint
- **Current:** `app/api/webhooks/trigger/[path]/route.ts` runs inside Next.js
- **Problem:** External services (GitHub, Stripe, Slack) need a stable public URL. The Electron app's URL changes / isn't publicly accessible.
- **Fix:** Move webhook receive to the gateway. Public URL becomes `https://gateway.yourdomain.com/api/webhooks/trigger/{path}`. Gateway looks up webhook in DB, executes workflow via the same `/v1/execute/workflow` route.
- **Files to move:** `app/api/webhooks/trigger/[path]/route.ts` + `lib/webhooks/processor.ts` → gateway

### Deploy API
- **Current:** `app/api/workflows/[id]/deploy/route.ts` runs inside Next.js
- **Consider:** Deploy could stay in the app (it's a user-initiated action), but the webhook registration should write paths that resolve to the gateway's public URL, not localhost.

---

## Must Add Before Production

### Provider-Specific Webhook Auth
- **Current:** `verifyProviderAuth()` in `lib/webhooks/processor.ts` is a stub that accepts all requests
- **Fix:** Add signature verification for each provider (GitHub HMAC-SHA256, Stripe signature, Slack signing secret, etc.)
- **Reference:** Sim's `lib/webhooks/utils.server.ts` has all the verification functions

### Pre-Deploy Validation
- **Current:** No client-side checks before deploying
- **Fix:** Port Sim's `runPreDeployChecks()` — validates blocks are connected, required fields are filled, no orphaned edges, etc.

### Change Detection (Update Button)
- **Current:** Deploy button shows "Deploy" or "Live" — no way to know if the workflow changed since last deploy
- **Fix:** Compare current workflow state hash with deployed version state hash. Show "Update" when they differ (like Sim does).

### Environment Variables
- **Current:** `envVarValues: {}` is hardcoded empty in executor calls
- **Fix:** Wire up the environment variables store / management UI so users can set API keys, secrets, etc. that get passed to the executor

---

## Feature Tabs (DB Tables Ready, No Backend/UI Yet)

### MCP Tool Publishing
- **Tables:** `workflow_mcp_tool` (exists), `mcp_servers` (exists)
- **What it does:** Expose deployed workflows as callable MCP tools on MCP servers
- **Gateway work:** Add MCP protocol handler (JSON-RPC over HTTP/stdio)
- **Sim reference:** `lib/mcp/workflow-mcp-sync.ts`, `app/api/mcp/`

### A2A Protocol (Agent-to-Agent)
- **Tables:** `a2a_agent`, `a2a_task`, `a2a_push_notification_config` (all exist)
- **What it does:** Expose deployed workflows as A2A-protocol agents that other agents can discover and call
- **Gateway work:** Add A2A JSON-RPC 2.0 serve endpoint, agent card generation
- **Sim reference:** `lib/a2a/`, `app/api/a2a/`

### Chat Widget Deployment
- **Tables:** `chat` (exists)
- **What it does:** Deploy a workflow as a public/protected chat interface with customizable UI
- **Gateway work:** Chat execution endpoint (streaming), auth (public/password/email/SSO)
- **Sim reference:** `app/api/chat/`, `app/chat/[identifier]/`

---

## Infrastructure Notes

- **Gateway repo:** `C:\Users\aravb\Desktop\Code\basics\basicsAdmin`
- **Gateway port:** 3002 (dev), routes through `GATEWAY_URL` env var
- **Shared DB:** Both the app and gateway need access to the same Postgres (port 5435 in dev)
- **Executor:** Currently lives in the app (`lib/sim/executor/`). For gateway execution, either:
  - (a) Copy the executor into the gateway, or
  - (b) Have the gateway call the app's `/api/workflows/[id]/run` endpoint (requires app to be running)
  - Option (a) is better for production since the app might be offline

# Phase 3E: Trigger Runtime — Make Triggers Actually Fire

## Current State
- **Done**: 193 trigger definition files ported (configs, subBlocks, outputs for 30+ services)
- **Done**: Trigger registry, types, index, constants, trigger-utils
- **Done**: Trigger block definitions exist in block registry
- **Missing**: The runtime that actually receives webhooks, runs schedules, and executes workflows

## How Sim Does It

### Architecture Overview
```
External Event (webhook POST / cron tick)
    ↓
API Route (receives the event)
    ↓
Webhook Processor / Schedule Executor
    ↓
Queue execution (Trigger.dev for async, inline for sync)
    ↓
Executor (same DAG executor used by Run button)
    ↓
Results logged
```

### Key Sim Files to Port

#### 1. Webhook Receive Endpoint
**Sim**: `app/api/webhooks/trigger/[path]/route.ts` (170 lines)
- `POST /api/webhooks/trigger/:path` — receives external HTTP calls
- Looks up webhook by path in DB → finds workflow
- Verifies provider auth (signatures, tokens)
- Parses body, handles provider challenges (Microsoft Graph validation, etc.)
- Queues execution via `queueWebhookExecution()`

**Our equivalent**: `app/api/webhooks/trigger/[path]/route.ts`
- Copy from Sim, adapt DB queries to our schema

#### 2. Webhook Processor
**Sim**: `lib/webhooks/processor.ts`
- `findAllWebhooksForPath()` — DB lookup: path → webhook → workflow
- `parseWebhookBody()` — handles JSON, form-data, raw text
- `verifyProviderAuth()` — checks provider-specific signatures (Stripe, GitHub, Slack, etc.)
- `queueWebhookExecution()` — creates execution record, triggers the workflow
- `shouldSkipWebhookEvent()` — filters duplicate/irrelevant events
- `handleProviderChallenges()` — responds to verification challenges

**Our equivalent**: `lib/webhooks/processor.ts`
- Copy from Sim. The provider-specific auth can be stubbed initially (just accept all).

#### 3. Deploy Route
**Sim**: `app/api/workflows/[id]/deploy/route.ts` (387 lines)
- `POST` — deploys workflow: snapshots state, registers webhooks, creates schedules
- `DELETE` — undeploys: deactivates webhooks, removes schedules
- `GET` — returns deployment status

Key operations on deploy:
1. `loadWorkflowFromNormalizedTables()` — loads full workflow state
2. `deployWorkflow()` — creates deployment version snapshot in `workflowDeploymentVersion` table
3. `saveTriggerWebhooksForDeploy()` — for each trigger block, creates/updates webhook records with unique paths
4. `createSchedulesForDeploy()` — for schedule triggers, creates cron job records
5. `syncMcpToolsForWorkflow()` — syncs MCP tool configs

**Our equivalent**: `app/api/workflows/[id]/deploy/route.ts`

#### 4. Webhook Registration (Deploy-time)
**Sim**: `lib/webhooks/deploy.ts`
- `saveTriggerWebhooksForDeploy()` — iterates trigger blocks, generates webhook paths, upserts into `webhook` table
- Each webhook gets a unique path: `/api/webhooks/trigger/{generated-uuid}`
- Stores: workflowId, blockId, triggerId, path, provider, isActive, config

**Our equivalent**: `lib/webhooks/deploy.ts`

#### 5. Schedule Infrastructure
**Sim**: `app/api/schedules/route.ts` (288 lines), `app/api/schedules/execute/route.ts` (205 lines)
- CRUD for schedule records
- `POST /api/schedules/execute` — called by Trigger.dev cron jobs to fire scheduled workflows
- `lib/workflows/schedules.ts` — `createSchedulesForDeploy()`, `validateWorkflowSchedules()`

**Sim uses Trigger.dev** for cron execution (see `trigger.config.ts`). We use **PgBoss** (already in package.json). The pattern is the same: cron tick → find due schedules → execute workflow.

**Our equivalent**:
- `app/api/schedules/route.ts` — CRUD
- `app/api/schedules/execute/route.ts` — execution endpoint
- PgBoss worker that polls for due schedules

#### 6. Deployment Persistence
**Sim**: `lib/workflows/persistence/utils.ts`
- `deployWorkflow()` — creates version snapshot
- `undeployWorkflow()` — marks workflow as undeployed
- `loadWorkflowFromNormalizedTables()` — loads blocks/edges/subflows from DB

**Our equivalent**: `lib/workflows/persistence/utils.ts`

#### 7. DB Schema Additions Needed
**Sim tables we need** (check `lib/db/schema/`):
- `webhook` — stores registered webhooks (path, workflowId, blockId, triggerId, provider, config, isActive)
- `workflowSchedule` — stores cron schedules (workflowId, cronExpression, timezone, isActive, lastRunAt, nextRunAt)
- `workflowDeploymentVersion` — snapshots of deployed workflow state

### UI Components Needed

#### Deploy Button
**Sim**: The canvas toolbar has a Deploy/Undeploy toggle button
- Calls `POST /api/workflows/[id]/deploy` to deploy
- Calls `DELETE /api/workflows/[id]/deploy` to undeploy
- Shows deployment status (deployed, needs redeployment, etc.)

#### Webhook URL Display
**Sim**: In the trigger block's editor panel, shows the generated webhook URL after deployment
- Uses `webhookUrlDisplay` subblock (readOnly short-input with copy button)
- URL format: `https://your-domain.com/api/webhooks/trigger/{webhook-path}`

## Implementation Order

### Step 1: DB Schema (30 min)
Add `webhook`, `workflowSchedule`, `workflowDeploymentVersion` tables to `lib/db/schema/workflows.ts`. Run migration.

### Step 2: Deployment Persistence (1 hour)
Port `lib/workflows/persistence/utils.ts` — `deployWorkflow()`, `undeployWorkflow()`, `loadWorkflowFromNormalizedTables()`.

### Step 3: Webhook Registration (1 hour)
Port `lib/webhooks/deploy.ts` — `saveTriggerWebhooksForDeploy()`. This runs at deploy time and creates webhook records.

### Step 4: Deploy API Route (1 hour)
Port `app/api/workflows/[id]/deploy/route.ts`. Wire deploy button in canvas.

### Step 5: Webhook Receive Endpoint (1 hour)
Port `app/api/webhooks/trigger/[path]/route.ts` and `lib/webhooks/processor.ts`. This is the runtime that receives external HTTP calls.

### Step 6: Schedule Infrastructure (2 hours)
Port schedule CRUD + PgBoss worker. Create `app/api/schedules/` routes. Wire PgBoss to poll for due schedules and call the executor.

### Step 7: Deploy Button UI (30 min)
Add deploy/undeploy button to canvas toolbar. Show deployment status.

## What We're NOT Porting (defer to later)
- Trigger.dev integration (we use PgBoss instead)
- Audit logging (`lib/audit/`)
- MCP tool sync on deploy
- Deployment version rollback
- Provider-specific webhook auth verification (accept all initially, add per-provider auth later)
- Polling triggers (Gmail, Outlook, IMAP, RSS) — these need a separate polling infrastructure

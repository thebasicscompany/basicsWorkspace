# Basics OS — Strategic Direction Analysis

> Based on YC application, codebase audit, and current build state. March 30, 2026.

---

## What You've Built (State of the Code)

**Solid foundation, real depth in the automation engine.** Here's the honest picture:

| Layer | Status | Notes |
|-------|--------|-------|
| Design system + shell | Done | Warm cream launchpad, sidebar, app tiles, page transitions |
| Auth + multi-tenancy | Done | Better Auth + organization plugin, session-scoped orgs |
| Unified data layer | Done | Single `records` table, `objectConfig` schema, event log, relationship graph, pgvector embeddings |
| CRM / Tasks / Notes / Meetings | Done (schema + routes) | Standard objects seeded, CRUD APIs, context events fire |
| Automations canvas | Done | ReactFlow, 250+ blocks ported from Sim, DAG executor, SSE streaming, deploy/undeploy |
| Tool integrations | Done (definitions) | 200+ block types, 193 trigger definitions, 15 Shop providers |
| OAuth + connections | Partial | Code complete, Slack tested via Railway gateway, not all providers e2e |
| Trigger runtime | Not built | Webhook receive, schedule worker, deploy-time registration — all planned, none wired |
| "Record and learn" agent | Not built | The core differentiator from the YC app doesn't exist in code yet |
| Custom tool builder | Not built | Claude Code integration for one-click tool creation isn't started |

**The gap:** Your YC pitch sells "hit record, walk through your workflow, the agent builds the automation." Your codebase sells "here's a visual automation builder with 250 blocks." Those are different products. The builder is impressive infrastructure, but the moat is the agent, not the canvas.

---

## Recommended Directions (Ordered by Impact)

### 1. Build the "Record" Flow — This Is the Product

**What:** A mode where the user says "I want to automate X," the agent watches them perform the workflow step-by-step (screen actions, tool interactions, data entry), asks clarifying questions, and generates an automation on the canvas.

**Why this first:** This is the entire pitch. Everything else is infrastructure that supports this. Without it, you're a worse version of n8n/Zapier with a nicer UI.

**How it maps to your code:**
- You already have the canvas, blocks, and executor. The agent just needs to *compose* workflows programmatically.
- The `workflow` store has `addBlock`, `addEdge`, `updateSubBlock` — an agent can call these.
- Your 250+ block registry is the action vocabulary the agent picks from.
- Start simple: text-based "describe your workflow" → agent builds it. Screen recording can come later.

**Concrete steps:**
1. Agent chat panel in the canvas (right side, alongside block editor)
2. Agent can read the block registry and propose a workflow as a sequence of blocks
3. User confirms/edits each step → blocks appear on canvas
4. Agent fills in sub-block configs (which Slack channel, which CRM field, etc.) by asking questions
5. One-click run to test, then deploy

This turns your 250 blocks from "features" into "capabilities the agent knows about."

---

### 2. Context Layer as the Competitive Moat

**What:** Make the unified data layer (records + events + relationships + embeddings) genuinely useful, not just a schema.

**Why:** Your pitch says "the more context you accumulate, the safer and more effective your automations get." Right now the context layer writes events and embeddings but nothing *reads* them intelligently. The agent doesn't use context to make better automation decisions.

**What's missing:**
- **Context app UI** — You have the route but the "god-mode view" of all activity across tools isn't built. This is the dashboard that makes companies feel the value of consolidation.
- **Agent context retrieval** — When the agent builds an automation, it should query embeddings to understand "what does this company's sales process look like" or "what fields matter in their CRM."
- **Cross-app intelligence** — "Every time a deal closes, these 5 things happen" should be discoverable from the event log. Pattern detection on `contextEvents` is the foundation of "observes how you work and identifies the repetitive stuff."

**This is the graduated handoff:**
1. Context layer passively logs everything (you have this)
2. Pattern detection surfaces "you do X → Y → Z every week" (build this)
3. Agent proposes an automation for that pattern (build this)
4. User approves, agent deploys (you have the deploy infra)

---

### 3. Finish the Trigger Runtime (Phase 3E)

**What:** Webhook receive endpoint, schedule worker, deploy-time registration.

**Why:** Without triggers, automations only run when someone clicks "Run." That's a demo, not a product. Deployed automations that fire on real events (Slack message, GitHub PR, schedule) are the difference between a toy and a tool people depend on.

**You've done the hard part** — 193 trigger definitions, webhook body parsers, the deploy/undeploy API. The remaining work is plumbing:
- `POST /api/webhooks/trigger/:path` — receive and route
- PgBoss cron worker for scheduled triggers
- Webhook registration on deploy (upsert `webhook` table rows)

This is probably 2-3 days of focused work and unlocks the entire "set it and forget it" value prop.

---

### 4. One-Click Custom Tool Builder

**What:** Let users describe a tool in natural language → Claude Code generates the API route + block definition → deploys into the workspace.

**Why:** This is the other half of the pitch: "anyone on your team can build and deploy custom tools with one click using agentic coding tools." It's also the answer to "why can't Anthropic do this" — you own the extensibility surface.

**How it maps to your code:**
- You have a clean block definition format (`BlockConfig` in `lib/sim/blocks/types.ts`) — 250 examples of it.
- You have a standard API route pattern (`app/api/tools/*/route.ts`) — 60+ examples.
- A code generation agent needs to: (a) scaffold a block definition, (b) scaffold an API route, (c) register it in the block registry, (d) hot-reload.

**Start with:** "Describe what your tool does" → generates a Function block with pre-filled code. No new infrastructure needed — Function blocks already execute arbitrary JS. Graduate to full custom blocks later.

---

### 5. Workspace-Native Connections (Replace SaaS)

**What:** For each connected service (Slack, Google, GitHub, etc.), offer a lightweight in-workspace alternative that stores data locally.

**Why:** "Long-term we get companies to churn off their SaaS subscriptions and build in-house on Basics OS." The custom objects system (`objectConfig` + `records`) already supports this — you can define any schema. The path is:

1. **Import** — Connect Slack, pull messages into records (you have the OAuth + block infra)
2. **Mirror** — Show Slack data in-workspace, keep it synced (webhook triggers)
3. **Replace** — Build a messaging app on your records table that deprecates the Slack connection

Your `objectConfig` system is perfectly designed for this — it's basically Airtable's schema model. The question is whether to build the replacement UIs or let users build them with the custom tool builder (#4).

---

### 6. Team/Collaboration Layer

**What:** Multi-user workspace with shared automations, approval flows, and audit trails.

**Why:** Your pitch says "built for teams" but the codebase is single-user. Better Auth's organization plugin gives you multi-tenancy (orgs, members, roles), but there's no:
- Shared automation ownership / permissions
- Approval workflows (human-in-the-loop for agent-proposed automations)
- Activity feed showing what the agent did across the team
- Role-based access to connections and data

**This matters for the graduated handoff story.** When an agent proposes an automation, *who* approves it? When it runs and fails, *who* gets notified? These are team problems, not individual ones.

---

## What to Deprioritize

- **More block types.** 250 is more than enough. The marginal value of block #251 is near zero compared to making the first 50 actually usable via the agent.
- **Sim file reconciliation polish.** The sub-block inputs (short-input, long-input, code editor) being simplified versions of Sim's is fine for now. Users won't interact with sub-blocks directly if the agent fills them in.
- **Desktop app / Electron.** Don't build a wrapper until the web app has the core agent experience.
- **Mobile / PWA.** Same reasoning.
- **Enterprise features (RBAC, billing, SSO).** Important eventually, but you need the core product loop working first.

---

## The Core Loop You're Building

```
User shows agent a workflow (text or screen)
        ↓
Agent queries context layer for patterns + data
        ↓
Agent proposes automation (blocks on canvas)
        ↓
User reviews, edits, approves
        ↓
Agent deploys (triggers, schedules, webhooks)
        ↓
Automation runs, logs to context layer
        ↓
Context layer gets smarter → agent proposes more automations
```

**Everything in your codebase supports this loop.** The blocks, the executor, the context layer, the triggers, the deploy infra — it's all there. The missing piece is the agent that ties it together. That's where to focus.

---

## Summary: Priority Stack

| Priority | Direction | Effort | Impact |
|----------|-----------|--------|--------|
| 1 | Agent-driven workflow builder ("Record" mode) | High | Defines the product |
| 2 | Context layer reads + pattern detection | Medium | Enables the flywheel |
| 3 | Trigger runtime (Phase 3E) | Low | Unlocks production use |
| 4 | One-click custom tool builder | Medium | Differentiator vs. closed platforms |
| 5 | Workspace-native app replacements | High | Long-term moat |
| 6 | Team collaboration + approvals | Medium | Required for B2B |

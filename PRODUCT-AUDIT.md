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

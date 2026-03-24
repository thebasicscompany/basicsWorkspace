# Basics Workspace — Vision

## One-line

A company operating system where **automations are the core product**. Every app is just data context that makes automations smarter.

---

## What it is

Basics Workspace is a team workspace built around the idea that software should work for you, not the other way around. Instead of hopping between 10 tabs, you open one workspace, connect your tools, and let agents do the repetitive work.

The interface is deliberately minimal — a Mac Launchpad grid of apps, a slim sidebar with 4 destinations, and a persistent AI agent that knows everything happening across your tools. It feels more like an OS than a SaaS product.

---

## The core bet

Most "all-in-one" tools bolt automations on as an afterthought. Here, automations are the reason people show up. CRM, Tasks, Notes, Meetings — these exist to give automations the context they need to do meaningful work. The richer your data, the smarter your automations.

Connections are the fuel. Every OAuth connection (Gmail, Slack, GitHub, HubSpot, Notion…) unlocks new triggers, actions, and data for the automation engine.

---

## The 4 sidebar destinations

**Home (Launchpad)** — A Mac Launchpad-style grid. Top half: your installed apps. Bottom half: your connected services. Everything you need at a glance. Click a tile to open the app full-screen. The sidebar stays visible for nav.

**Shop** — The app store. Three tabs: Automation Templates (pre-built workflows to install), Apps (new tools to add to your launchpad), Connections (browse and connect integrations). A natural-language prompt at the top lets you describe what you want to automate and the Agent builds it.

**Agent** — The general "talk to your OS" interface. Persistent chat panel. Knows your installed apps, connections, and data. Can build automations, query CRM, summarize meetings, create tasks, search Context. Not the same as the Automations copilot (that lives inside the Automations app) — this is the broader OS-level interface.

**Context** — God-mode data view. Everything from every app in one place: a chronological Timeline feed, a Graph showing relationships between contacts/deals/meetings/automations, and a filterable Table across all entity types. The "brain" of the workspace — where you see the full picture of what's happening.

---

## App model

Apps are first-class. Each app lives in `apps/{slug}/` with a typed manifest:
- **Automations** — the hero app. Visual workflow builder powered by the Sim DAGExecutor.
- **CRM** — an app group (contacts, companies, deals). Group tiles show a 2×2 icon preview like an iPhone folder.
- **Tasks** — team task management.
- **Notes** — knowledge capture.
- **Meetings** — recordings, transcripts, summaries.
- **Meeting Assistant** — real-time in-meeting assistant.

New apps are added by creating a manifest + registering in the registry. The launchpad is fully data-driven — no hardcoded tiles.

---

## Design language

- **Warm cream backgrounds** — not stark white. `#F9F7F4` base, `#EFEDE9` sidebar.
- **Brand green accent** — `#2D8653`. Used for active nav states, CTAs, highlights. Nothing else gets this color.
- **Inter font** — always. No system font fallbacks.
- **Phosphor icons** — filled weight for active/selected states, regular for inactive.
- **Framer Motion** — subtle page transitions (fade + slight upward slide). Tile hover/press animations.
- **No floating windows** — everything is full-page navigation. Modals only within the current app context.
- **56px sidebar** — fixed, never collapses. Icon-first. The sidebar is always visible.

---

## Stack

- **Frontend:** Next.js 15 App Router, React 19, TypeScript
- **UI:** Tailwind CSS v4, Radix UI, Framer Motion, Phosphor Icons
- **Data:** TanStack Query v5, Drizzle ORM, PostgreSQL
- **Auth:** Better Auth (session-based)
- **Automations engine:** Sim DAGExecutor (ported from basicsOS)
- **AI:** Gateway API at `api.basicsos.com` for LLM calls, tool execution, OAuth token management
- **Desktop (future):** Electron wrapper for voice pill, screen capture, global shortcuts

---

## What this is NOT

- Not a note-taking app with automations tacked on
- Not another Notion clone
- Not trying to replace every tool — it connects them
- Not hiding complexity behind a "simple" UI — power users can see everything in Context

---

## Reference codebase

`../basicsOS` (nextjs-plan branch) is the reference implementation. Copy patterns liberally — auth setup, Drizzle schema, Sim executor, connection components, TanStack Query hooks. Don't reinvent what already works there.

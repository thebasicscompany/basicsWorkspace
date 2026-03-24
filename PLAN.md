# basics-workspace — Implementation Plan

> Company OS. Automations-first. Mac Launchpad workspace. Built for teams.

---

## Vision

A company operating system where **automations are the core product**. Every app (CRM, Tasks, Notes, Meetings) is just data context that makes automations smarter. Connections are fuel. The workspace is the cockpit.

Users open their workspace and see a clean launchpad — their apps and tools at a glance. They install what they need from the Shop, connect their services, and let agents do the work. Context gives them a god-mode view of everything happening across all their tools.

---

## Phase 0: Design System & Shell

> **Do this before writing a single feature.** Every app, every component, every screen inherits from this. Get this right and the rest snaps into place.

---

### 0.1 Design Tokens

Define all tokens in `app/globals.css` as CSS custom properties. Tailwind v4 picks these up natively — no `tailwind.config.js` needed.

#### Color Palette

**Accent:** Warm indigo — `#6366F1` (Tailwind `indigo-500`). Used for: CTAs, active states, focus rings, highlights. Nothing else gets this color.

**Surfaces (light mode):**
```
--color-bg-base:        #F9F7F4   ← warm cream / content area background
--color-bg-surface:     #FFFFFF   ← cards, panels, tiles
--color-bg-elevated:    #FFFFFF   ← modals, popovers (with shadow)
--color-bg-subtle:      #F4F2EF   ← hover states, secondary surfaces
--color-bg-sidebar:     #EFEDE9   ← sidebar background, slightly darker than base
```

**Text:**
```
--color-text-primary:   #18181B   ← zinc-900, main content
--color-text-secondary: #71717A   ← zinc-500, labels, metadata
--color-text-tertiary:  #A1A1AA   ← zinc-400, placeholders, disabled
--color-text-accent:    #6366F1   ← active nav items, links
```

**Borders:**
```
--color-border:         #E4E2DE   ← default border, warm not cool
--color-border-strong:  #D4D2CE   ← stronger dividers
```

**Semantic:**
```
--color-success:        #22C55E   ← green-500
--color-warning:        #F59E0B   ← amber-500
--color-error:          #EF4444   ← red-500
--color-info:           #6366F1   ← same as accent
```

No pure `#000000` or pure `#FFFFFF` in the UI. Everything slightly warm.

#### Typography

**Font:** Inter. Load via `next/font/google`. No fallback to system — Inter always.

```
--font-sans: 'Inter', sans-serif

Scale:
  xs:   11px / 1.5  — metadata, timestamps, labels
  sm:   13px / 1.5  — secondary content, table cells
  base: 14px / 1.6  — default body text
  md:   15px / 1.5  — slightly emphasized body
  lg:   18px / 1.4  — section headings
  xl:   22px / 1.3  — page titles
  2xl:  28px / 1.2  — hero text (launchpad greeting)

Weights:
  normal:   400  — body
  medium:   500  — labels, nav items
  semibold: 600  — headings, tile names
  bold:     700  — use sparingly
```

Letter-spacing: `-0.01em` on headings (slightly tighter). Normal on body.

#### Spacing

Base unit: `4px`. All spacing is multiples of 4.
```
1 = 4px,  2 = 8px,  3 = 12px,  4 = 16px,  5 = 20px,
6 = 24px, 8 = 32px, 10 = 40px, 12 = 48px, 16 = 64px
```

#### Radius

```
sm:   6px   ← badges, chips, small buttons
md:   10px  ← inputs, small cards
lg:   14px  ← regular cards, panels
xl:   18px  ← modals, drawers
2xl:  22px  ← app tiles (the rounded-square launchpad feel)
full: 9999px ← pill buttons, avatars
```

#### Shadows

```
sm:  0 1px 2px rgba(0,0,0,0.05)                        ← cards, tiles (resting)
md:  0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)  ← hover, popovers
lg:  0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06) ← modals, elevated panels
```

All shadows are slightly warm (not pure black alpha). Tiles use `shadow-sm` at rest, `shadow-md` on hover.

---

### 0.2 Shell Architecture

The shell is the persistent frame. It never unmounts. Apps swap in and out of the content area.

#### Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│  [Sidebar 56px]  │  [Content Area — fills remaining]    │
│                  │                                        │
│  [logo]          │  [App Header 48px — breadcrumb]       │
│  ─────           │  ────────────────────────────────     │
│  [home]          │                                        │
│  [shop]          │  [App Content — scrolls]              │
│  [agent]         │                                        │
│  [context]       │                                        │
│                  │                                        │
│  ─────           │                                        │
│  [avatar]        │                                        │
└──────────────────────────────────────────────────────────┘
```

**Sidebar:** `56px` wide, fixed, never collapses. Background: `--color-bg-sidebar`. No border — use the background color difference to separate from content.

**Content area:** Everything to the right of the sidebar. Has two sub-regions:
- **App Header** (`48px` tall): breadcrumb + optional action buttons. Subtle `border-b`.
- **App Content**: scrollable region. Background: `--color-bg-base` (warm cream).

#### Sidebar Component (`components/workspace-sidebar.tsx`)

```typescript
// Structure
<aside className="w-14 h-screen flex flex-col bg-[--color-bg-sidebar] fixed left-0 top-0 z-50">
  {/* Logo / Org Avatar - top */}
  <OrgAvatar />

  {/* Nav items - center, with gap */}
  <nav className="flex-1 flex flex-col items-center gap-1 pt-4">
    <SidebarItem href="/"        icon={HouseIcon}       label="Home"    />
    <SidebarItem href="/shop"    icon={StorefrontIcon}  label="Shop"    />
    <SidebarItem href="/agent"   icon={RobotIcon}       label="Agent"   />
    <SidebarItem href="/context" icon={GraphIcon}       label="Context" />
  </nav>

  {/* User avatar - bottom */}
  <UserAvatar />
</aside>
```

**SidebarItem active state:** When active, the icon gets accent color (`text-indigo-500`) and a small filled background pill (`bg-indigo-50 rounded-xl`). Inactive: `text-zinc-400`, no background.

**Home active rule:** The Home icon is active when the user is on `/` (launchpad) OR inside any app launched from the launchpad (e.g., `/crm`, `/automations`, `/tasks`). Shop, Agent, Context each own their own active states.

**Tooltip:** Each icon shows a tooltip on hover with the label (Radix Tooltip, 400ms delay).

#### App Header Component (`components/app-header.tsx`)

Sits at the top of the content area. Shows breadcrumb + optional right-side actions.

```typescript
// Breadcrumb examples:
// On launchpad:        (nothing — no breadcrumb on home)
// Inside CRM:          Workspace > CRM
// Inside Contacts:     Workspace > CRM > Contacts
// Inside a Contact:    Workspace > CRM > Contacts > Sarah Chen

// Props
interface AppHeaderProps {
  breadcrumb: { label: string; href?: string }[]
  actions?: React.ReactNode  // right side — sort, filter, create buttons, etc.
}
```

Style: `48px` tall, `bg-white`, `border-b border-[--color-border]`. Breadcrumb text in `text-sm text-zinc-400`, separators `text-zinc-300`, current page `text-zinc-700 font-medium`. No icons in breadcrumb — text only.

#### Root Layout (`app/layout.tsx`)

```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[--color-bg-base]">
        <WorkspaceSidebar />
        <main className="ml-14 min-h-screen flex flex-col">
          {children}  {/* Each page renders its own AppHeader + content */}
        </main>
      </body>
    </html>
  )
}
```

Each page/layout composes its own `<AppHeader>` at the top, then its own scrollable content below. No global header — each app owns its header content.

---

### 0.3 Launchpad Design

#### Grid Layout

Two sections stacked vertically, separated by a labeled divider.

```
[section label: "YOUR APPS" in small-caps, text-zinc-400, text-xs]
[5-column grid of app tiles]

[16px gap]
[thin border divider]
[section label: "CONNECTIONS" in small-caps, text-zinc-400, text-xs]
[5-column grid of connection tiles]
```

Grid: `grid-cols-5` on desktop (`lg`), `grid-cols-4` on tablet (`md`), `grid-cols-3` on mobile. `gap-4` between tiles.

Page padding: `p-8` (`32px`) on all sides. Greeting text above the grid.

#### App Tile (`components/launchpad/app-tile.tsx`)

```
┌─────────────────┐
│                 │  ← rounded-2xl, bg-white, shadow-sm, border border-[--color-border]
│   [icon 32px]   │  ← centered, indigo or custom color
│                 │
└─────────────────┘
  App Name           ← text-sm font-semibold text-zinc-700, centered below tile
  Subtitle           ← text-xs text-zinc-400 (optional, e.g. "3 active" for automations)
```

- Tile: `aspect-square` (perfectly square), `p-5`, `rounded-2xl`
- Icon: `32px`, uses Phosphor icon, color is app-specific (indigo for Automations, emerald for CRM, amber for Tasks, etc.)
- Hover: `shadow-md`, `scale-[1.03]`, transition `duration-150 ease-out`
- Press: `scale-[0.97]`
- All transitions via Framer Motion `whileHover` + `whileTap`

#### App Group Tile (CRM)

Same tile shape as a regular app. Displays a 2×2 mini-grid of sub-app icons inside (Contacts, Companies, Deals, +) to signal it's a group — like iOS folder preview.

On click: **replaces the launchpad** with a focused "group view" — a clean page showing just the sub-apps of that group in a larger grid. Back button (or Home in sidebar) returns to launchpad.

No expansion-in-place for now. One focused window only.

#### Connection Tile

Same tile shape. Shows the service logo (from `service-icons.tsx`). Connected services show a small green dot `●` in the top-right corner. Unconnected show a faint `+` overlay on hover.

#### Launchpad Greeting

Above the grid:
```typescript
// Time-based greeting, large and friendly
<h1 className="text-2xl font-semibold text-zinc-800 mb-8">
  Good morning, {firstName}.
</h1>
```

---

### 0.4 Navigation & Transition System

#### One Focused Window

Only one app is ever visible at a time. No side-by-side, no floating panels, no modals-over-apps. If something needs a modal (create record, confirm delete), it's a Radix Dialog within the current app — not a new "window."

Exception: the Agent (sidebar icon) opens as a right-side panel that overlays the current content. Dismissed by pressing Agent again or pressing Escape.

#### App Open Transition

When clicking a tile on the launchpad:
1. The clicked tile does a brief `scale(1.05)` → `scale(1)` spring (Framer Motion)
2. The launchpad content fades out (`opacity: 0`, `duration: 150ms`)
3. The app content fades in + slight upward translate (`y: 8 → 0`, `opacity: 0 → 1`, `duration: 200ms`)

Not a full iOS-style zoom-from-tile. Subtle. Fast. Clean.

```typescript
// Page transition wrapper — wrap every app page's content with this
export const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {children}
  </motion.div>
)
```

#### Back to Launchpad

Click **Home** in sidebar → navigate to `/`. The launchpad fades back in. No back button anywhere else.

---

### 0.5 Core Component Primitives

Build these first. Every app uses them.

| Component | File | Purpose |
|-----------|------|---------|
| `AppTile` | `components/launchpad/app-tile.tsx` | Launchpad grid tile |
| `AppHeader` | `components/app-header.tsx` | Breadcrumb + actions bar |
| `PageTransition` | `components/page-transition.tsx` | Fade-in wrapper for every page |
| `WorkspaceSidebar` | `components/workspace-sidebar.tsx` | 4-icon sidebar |
| `SidebarItem` | `components/workspace-sidebar.tsx` | Single nav icon with tooltip + active state |
| `SectionLabel` | `components/section-label.tsx` | Small-caps section divider label |
| `Card` | `components/ui/card.tsx` (shadcn) | Standard surface card |
| `EmptyState` | `components/ui/empty-state.tsx` | Empty content placeholder |

---

### 0.6 Phase 0 Build Checklist

```
□ Set up Inter font via next/font/google
□ Define all CSS custom properties in app/globals.css (colors, radius, shadows)
□ Configure Tailwind v4 to use CSS vars
□ Build WorkspaceSidebar — 4 icons, active state, tooltips, user avatar
□ Build AppHeader — breadcrumb props, right-side actions slot
□ Build PageTransition — Framer Motion fade+slide wrapper
□ Build AppTile — square, rounded-2xl, hover animation, icon + name + subtitle
□ Build SectionLabel — small-caps divider
□ Wire root layout: sidebar (fixed 56px) + main (ml-14)
□ Build Launchpad page with hardcoded app tiles (no DB yet)
□ Build app group "group view" page (hardcoded CRM sub-apps)
□ Build stub pages: /shop, /agent, /context (just AppHeader + EmptyState)
□ Verify: sidebar active states work correctly across all routes
□ Verify: Home stays active when navigating into /crm, /automations, /tasks
□ Verify: page transitions feel right (not slow, not jarring)
□ Verify: all tiles hover/press animations work
□ Verify: breadcrumb updates correctly per route
□ Verify: warm cream background, correct font, accent color throughout
□ Verify: looks correct at 1280px, 1440px, 1920px widths
```

**Deliverable:** A running Next.js app with the full shell, correct design tokens, launchpad with hardcoded tiles, all 4 sidebar destinations as stubs, transitions working. Zero real data. Zero features. Just the shell — but it should feel like the real product.

---

## Stack Decision

**Next.js 15 (App Router) + Electron**

Rationale:
- Web-first SaaS (teams access from browser, not just desktop) — Next.js is the right foundation
- Electron wraps the Next.js app for desktop-specific features: voice pill, screen capture, global shortcuts
- Sim DAGExecutor is pure Node.js — works in Next.js API routes unchanged
- Same pattern as basicsOS `nextjs-plan` branch (reference codebase) — proven approach
- If it ever stays desktop-only, this is the one thing to revisit. But bet on web.

**Full stack:**
- **Frontend:** Next.js 15 App Router, React 19, TypeScript
- **UI:** Shadcn UI, Radix UI, Tailwind CSS v4
- **Data:** TanStack Query v5, Drizzle ORM, PostgreSQL (Neon or local Docker)
- **Auth:** Better Auth (session-based, same as basicsOS)
- **Desktop:** Electron (voice pill, screen capture, global shortcuts)
- **Automations:** Sim DAGExecutor (ported from basicsOS packages/server/src/lib/sim/)
- **AI:** Gateway API (basicsos.com/api-docs) for LLM, tool execution, OAuth token management

**Reference codebase:** `../basicsOS` (nextjs-plan branch) — copy patterns from here, don't reinvent

---

## Core UX Model

### Sidebar (4 items only — always visible, slim left rail)

```
[Logo / Org]
─────────────
🏠  Home      → Launchpad (the workspace grid)
🛍️  Shop      → App Store (templates, apps, connections)
🤖  Agent     → Persistent AI agent (matrix-OS style bottom prompt)
🔮  Context   → Data universe (everything from every app, unified)
─────────────
[User avatar]
```

Sidebar is narrow and icon-first. Labels visible when expanded. Everything else is inside the apps.

### Launchpad (Home page)

```
┌─────────────────────────────────────────────────────────┐
│  Good morning, Arav.                                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  YOUR APPS                                        │   │
│  │                                                   │   │
│  │  [Automations]  [CRM ▸]  [Tasks]  [Notes]        │   │
│  │                                                   │   │
│  │  [Meetings]  [Meeting Asst]  [+ from Store]       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CONNECTIONS (fuel for automations)               │   │
│  │                                                   │   │
│  │  [Gmail ✅] [Slack ✅] [Notion ✅] [GitHub ✅]   │   │
│  │  [HubSpot ✅] [+ Add more]                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- Clicking an app → full-page navigation, sidebar still visible for nav back
- App groups (CRM ▸) → expand inline like iPhone folder, showing sub-apps (Contacts, Companies, Deals)
- Connections → clicking an unconnected one opens OAuth flow; clicking connected one opens its config
- "+ from Store" → goes to Shop

### App Groups (iPhone folder concept)

CRM is the first app group. When clicked:
- The grid item expands inline (smooth animation) showing sub-apps
- Sub-apps: Contacts, Companies, Deals
- Click a sub-app → navigate to that page full-screen
- Click outside → collapses back

Other future groups: Google Suite (Sheets, Drive, Calendar), Microsoft Suite, etc.

### Shop

Three tabs:
1. **Automations** — pre-built automation templates. Click to install → appears in Automations Engine
2. **Apps** — new apps to add to launchpad (Meeting Assistant, On Screen Agent, custom CRMs, etc.)
3. **Connections** — browse all available integrations, connect new ones

Voice/text prompt at the top: "Describe what you want to automate..." → sends to Agent to build

### Agent

Persistent AI interface. Slim panel that opens from the sidebar icon.
- Text box at bottom (matrix-OS style)
- Conversation history above
- Knows about all installed apps, connections, and your data
- Can: build automations, query CRM, summarize meetings, create tasks, search across Context
- NOT the same as the Automations copilot (that lives inside the Automations app)
- This is the general "talk to your OS" interface

### Context

The god-mode data view. Everything from every app, in one place.

Sections:
1. **Timeline** — chronological feed of everything: emails received, automations run, meetings recorded, tasks completed, records created/updated
2. **Graph** — visual relationship map: contact → their deals → their meetings → their notes → automations triggered by them
3. **Table** — filterable/sortable table across all entity types with global search
4. **Insights** (future) — AI-generated summaries: "this week, 3 automations ran, 12 emails sent, deal pipeline moved $50k forward"

This is the feature that ties everything together and becomes the "brain" of the workspace.

---

## Data Model

### Core Tables (new, workspace-specific)

```sql
-- Installed apps for this workspace
workspace_apps (
  id, workspace_id, app_slug, app_name, app_type,
  icon, color, position, group_id, is_installed,
  config jsonb, created_at
)

-- App groups (iPhone folder concept)
app_groups (
  id, workspace_id, name, icon, position, created_at
)

-- App store catalog (what's available to install)
app_catalog (
  id, slug, name, description, icon, category,
  type (builtin|community|custom), is_featured,
  config_schema jsonb, created_at
)

-- Automation templates in the store
automation_templates (
  id, name, description, category, tags,
  workflow_definition jsonb, required_connections text[],
  preview_image, install_count, created_at
)

-- Context events (unified activity log)
context_events (
  id, workspace_id, user_id, source_app, event_type,
  entity_type, entity_id, entity_name, summary,
  metadata jsonb, created_at
)
```

### Reused from basicsOS

All existing tables port directly:
- `users`, `sessions`, `organizations` (Better Auth)
- `contacts`, `companies`, `deals`, `tasks` (CRM — via object_config pattern)
- `notes`, `meetings`, `recordings`
- `threads`, `thread_messages` (AI chat)
- `workflows`, `workflow_runs`, `workflow_blocks`, etc. (Sim executor tables)
- `oauth_connections` (gateway connections)

---

## Implementation Phases

---

### Phase 1: Foundation (start here)

**Goal:** Running app with new sidebar + launchpad. Nothing functional yet, but the shell is right.

#### 1.1 Project Setup

```bash
# Use create-next-app with the right config
npx create-next-app@latest basics-workspace \
  --typescript --tailwind --app --src-dir=false \
  --import-alias "@/*"

# Then install core deps
pnpm add better-auth drizzle-orm @neondatabase/serverless
pnpm add @tanstack/react-query
pnpm add @radix-ui/react-* (via shadcn)
pnpm add @phosphor-icons/react
pnpm add framer-motion
pnpm add sonner
```

Copy from basicsOS (nextjs-plan branch):
- `components/ui/` — all Shadcn components
- `components/ui/sidebar.tsx` — sidebar primitive
- `lib/auth.ts`, `lib/auth-client.ts` — Better Auth setup
- `lib/db/` — Drizzle config + schema
- `hooks/use-organization.ts`, `hooks/use-me.ts`

#### 1.2 New Slim Sidebar

File: `components/workspace-sidebar.tsx`

Four items: Home, Shop, Agent, Context. Icon-only by default, labels on hover/expand.
Keep the same Shadcn Sidebar primitive from basicsOS — just strip down the nav groups.

```typescript
const NAV_ITEMS = [
  { href: '/',        icon: HouseIcon,     label: 'Home',    tooltip: 'Workspace' },
  { href: '/shop',    icon: StorefrontIcon, label: 'Shop',   tooltip: 'App Store' },
  { href: '/agent',   icon: RobotIcon,     label: 'Agent',   tooltip: 'AI Agent' },
  { href: '/context', icon: GraphIcon,     label: 'Context', tooltip: 'Data Universe' },
]
```

Footer: user avatar with dropdown (profile, settings, sign out).

#### 1.3 Launchpad Page

File: `app/(workspace)/page.tsx` (this is the `/` route)

Two sections:
- `<AppGrid />` — top half, installed apps
- `<ConnectionsGrid />` — bottom half, connected services

`AppGrid` reads from `workspace_apps` table via `/api/apps` endpoint.
Seed it with defaults on first run: Automations, CRM Group, Tasks, Notes, Meetings.

`ConnectionsGrid` reads from gateway `/v1/connections` (proxied through `/api/connections`).

App card component: icon, name, group indicator (▸), installed state. Framer Motion for hover scale.

App group expansion: when clicking a group card, use Framer Motion `AnimatePresence` to expand sub-apps inline within the grid. No navigation — it expands in place.

#### 1.4 Routing Shell

```
app/
├── (workspace)/
│   ├── layout.tsx          ← WorkspaceSidebar + main content area
│   ├── page.tsx            ← Launchpad
│   ├── shop/page.tsx       ← App Store (stub)
│   ├── agent/page.tsx      ← Agent (stub)
│   └── context/page.tsx    ← Context (stub)
├── (apps)/
│   ├── automations/        ← Automations Engine
│   ├── crm/                ← CRM app group
│   │   ├── contacts/
│   │   ├── companies/
│   │   └── deals/
│   ├── tasks/
│   ├── notes/
│   └── meetings/
├── (auth)/
│   ├── sign-in/
│   └── sign-up/
└── api/
    ├── apps/               ← workspace_apps CRUD
    ├── connections/        ← OAuth proxy (port from basicsOS)
    ├── workflows/          ← Sim executor (port from basicsOS)
    └── me/
```

#### 1.5 Auth + DB

Port directly from basicsOS nextjs-plan branch:
- `lib/auth.ts` — Better Auth with same config
- `lib/db/schema.ts` — add new workspace tables on top of existing schema
- `app/api/auth/[...all]/route.ts` — Better Auth handler

Run `pnpm drizzle-kit push` to create tables.

#### Deliverable:
Launchpad with app grid, slim sidebar with 4 items, clicking apps navigates full-page. Auth works. DB connected.

---

### Phase 2: Core Apps

**Goal:** All core apps working as full pages navigated to from the launchpad.

#### 2.1 CRM App (App Group)

Port from basicsOS:
- ObjectRegistry pattern (object_config + custom_field_defs)
- ObjectListPage → `app/(apps)/crm/[object]/page.tsx`
- RecordDetailPage → `app/(apps)/crm/[object]/[id]/page.tsx`
- All hooks: useRecords, useRecord, useCreateRecord, useUpdateRecord, useDeleteRecord
- DataTable component with views, sorts, filters
- Field types registry (all 18 types)

CRM is the "app group" in the launchpad — clicking it expands to show Contacts, Companies, Deals sub-apps.

#### 2.2 Tasks

Port from basicsOS:
- `app/(apps)/tasks/page.tsx`
- useRecords('tasks') hook
- Time-based grouping (Overdue, Today, Tomorrow, This Week, Later)

#### 2.3 Notes

Port from basicsOS:
- `app/(apps)/notes/page.tsx`
- Notes attached to contacts/deals

#### 2.4 Meetings

Port from basicsOS:
- `app/(apps)/meetings/page.tsx`
- Meeting recordings list

#### 2.5 App Install/Uninstall

- `workspace_apps` table tracks what's installed
- Uninstall → remove from launchpad grid (but data persists)
- Install from Shop → add row, appears in grid
- Default apps auto-installed on first workspace creation (seed migration)

---

### Phase 3: Automations Engine

**Goal:** Full Sim DAGExecutor working with canvas UI and all existing providers.

#### 3.1 Port Sim Executor

Copy verbatim from basicsOS:
```
packages/server/src/lib/sim/ → lib/sim/
  executor/
  tools/
    index.ts
    gateway-adapter.ts
  blocks/
  providers/
  serializer/
  sim-context.ts
```

Expose via:
- `app/api/workflows/route.ts` — CRUD
- `app/api/workflows/[id]/run/route.ts` — execute
- `app/api/workflows/[id]/log/route.ts` — execution log

#### 3.2 Canvas UI

Port from basicsOS packages/automations:
- Workflow canvas (React Flow / xylflow)
- Block nodes (Starter, Agent, Tool blocks, etc.)
- Node config panel
- Variable picker

Route: `app/(apps)/automations/page.tsx` (list) and `app/(apps)/automations/[id]/page.tsx` (canvas)

#### 3.3 Connections OAuth

Port from basicsOS:
- `app/api/connections/[provider]/authorize/route.ts`
- `app/api/connections/[provider]/callback/route.ts`
- `components/connections/ConnectionsContent.tsx`

These appear in both the Connections section of the launchpad AND the Shop's "Connections" tab.

#### 3.4 Automations Copilot (built into Automations app)

The Automations app has its own AI assistant for building workflows.
This is separate from the global Agent sidebar.
Uses the same Sim executor / gateway chat under the hood.

---

### Phase 4: Shop

**Goal:** Users can browse and install automation templates and new apps.

#### 4.1 Automation Templates Tab

- `app_catalog` and `automation_templates` tables
- Browse templates by category (Marketing, Sales, DevOps, HR, etc.)
- Preview: shows workflow graph, required connections, description
- Install: POST `/api/shop/templates/[id]/install` → creates workflow in user's Automations

Seed 10-15 templates at launch:
- "New GitHub issue → Slack notification"
- "Gmail → summarize with AI → add to Notion"
- "New HubSpot contact → create CRM record"
- "Daily briefing: pull calendar + tasks → send Slack summary"
- etc.

#### 4.2 Apps Tab

- Browse installable apps: Meeting Assistant, On Screen Agent (future), custom tools
- Each app card: name, description, category, required connections, "Install" button
- Install → adds to `workspace_apps`, appears in launchpad

Built-in apps available in store:
- **Meeting Assistant** — records meetings, generates transcripts/summaries, action items
- **On Screen Agent** (v2 roadmap) — screen recording → automation, workflow capture

#### 4.3 Connections Tab

- Same ConnectionsContent component from Phase 3
- Browse all available services, connect new ones
- Distinguishes: OAuth (button) vs API Key (text input)

#### 4.4 Voice/Text Prompt in Shop

Text box at top of Shop: "What do you want to automate?"
→ Sends to Agent which suggests templates or offers to build a custom automation
→ Returns list of matching templates or opens Automation builder pre-filled

---

### Phase 5: Agent

**Goal:** Global AI interface accessible from sidebar, knows about all workspace data.

#### 5.1 Agent Panel

Opens as a right-side panel (not full page) when clicking Agent in sidebar.
Or full-page at `/agent` route — user can toggle.

Layout:
```
┌─────────────────────────────────┐
│  Agent                          │
│  ─────────────────────────────  │
│  [conversation history]         │
│                                 │
│  ─────────────────────────────  │
│  [type anything...]      [send] │
└─────────────────────────────────┘
```

#### 5.2 Agent Capabilities

Agent has tools for:
- Query CRM: search contacts, deals, companies
- Query Tasks: list overdue, create task
- Query Notes: search across all notes
- Build automation: given description → scaffold workflow in Automations app
- Install app from store: "add Meeting Assistant to my workspace"
- Query Context: "what happened in my workspace this week"

Uses gateway `/v1/chat/completions` with `execute_tools: true`.
Maintains thread history per user.

#### 5.3 Context Awareness

Agent system prompt includes:
- Installed apps list
- Connected services list
- Recent Context events (last 10)
- User's name + org name

---

### Phase 6: Context

**Goal:** Unified data view across all apps.

#### 6.1 Event Logging

Every significant action across all apps writes a `context_events` row:
- CRM: record created/updated
- Automations: workflow run started/completed/failed
- Meetings: new recording added
- Tasks: task completed
- Connections: new service connected
- Agent: conversation started

Write via a shared `logContextEvent()` helper called from each app's API routes.

#### 6.2 Timeline View (v1)

`app/(workspace)/context/page.tsx`

Chronological feed, newest first. Each event card shows:
- Source app icon + name
- Event type
- Entity name (linked)
- Summary
- Timestamp

Filters: by app, by entity type, by date range.

#### 6.3 Table View (v1)

Global search + filter across all entity types.
TanStack Table with virtual scrolling for large datasets.
Click row → navigate to the entity's detail page.

#### 6.4 Graph View (v2 roadmap)

Visual relationship map using D3 or react-force-graph.
Nodes: contacts, deals, meetings, automations.
Edges: relationships (contact attended meeting, deal triggered automation, etc.).
This is a killer feature — save for v2.

---

### Phase 7: Onboarding

**Goal:** First-run wizard that sets up the workspace step by step.

#### 7.1 Onboarding Flow

Triggered on first sign-in (no `workspace_apps` rows yet).

Steps:
1. **Welcome** — "Let's set up your workspace. What does your team primarily do?"
   - Options: Sales, Marketing, Engineering, Operations, Other
2. **Connect your tools** — based on answer, suggest relevant connections
   - Sales → suggest HubSpot/Salesforce + Gmail + Slack
   - Engineering → suggest GitHub + Slack + Notion
   - Each has "Connect" button that opens OAuth popup
3. **Choose your apps** — grid of app cards to add to launchpad
   - Pre-selected based on category answer
   - "Build your own" option → takes to Automations Builder
4. **Install starter automations** — suggest 3 templates based on connected tools
5. **Done** → lands on Launchpad with apps installed

#### 7.2 "Build Your Own" Path

If user selects "Build your own" at step 3:
- Skip to Automations Builder with a starter template loaded
- Agent is pre-opened with: "I see you connected [Slack, Gmail]. What would you like to automate first?"

---

## Component Architecture

### Key Components to Build (new)

```
components/
├── workspace-sidebar.tsx       ← 4-item slim sidebar
├── launchpad/
│   ├── app-grid.tsx            ← top half app grid
│   ├── app-card.tsx            ← individual app tile
│   ├── app-group-card.tsx      ← expandable group tile
│   └── connections-grid.tsx    ← bottom half connections
├── shop/
│   ├── shop-tabs.tsx           ← Automations/Apps/Connections tabs
│   ├── template-card.tsx
│   └── app-catalog-card.tsx
├── agent/
│   ├── agent-panel.tsx         ← conversation UI
│   └── agent-input.tsx         ← bottom prompt bar
├── context/
│   ├── context-timeline.tsx
│   ├── context-event-card.tsx
│   └── context-table.tsx
└── ui/                         ← copy from basicsOS
```

### Key Hooks to Build

```
hooks/
├── use-workspace-apps.ts       ← installed apps query
├── use-app-catalog.ts          ← store catalog query
├── use-install-app.ts          ← install mutation
├── use-context-events.ts       ← unified event feed
├── use-agent.ts                ← agent chat (wraps useGatewayChat)
└── [port from basicsOS]
    ├── use-records.ts
    ├── use-views.ts
    ├── use-me.ts
    ├── use-organization.ts
    └── use-threads.ts
```

---

## Key Patterns to Follow from basicsOS

1. **Auth:** Better Auth with session cookies. `lib/auth.ts` is the source of truth.
2. **API routes:** Next.js App Router route handlers. Auth check at top: `const session = await auth.api.getSession(...)`.
3. **Data fetching:** TanStack Query. Query keys: `["resource", params]`. Mutations invalidate relevant keys.
4. **UI:** Shadcn + Tailwind v4. No custom CSS files — utility classes only.
5. **Database:** Drizzle ORM. Schema in `lib/db/schema.ts`. Migrations via `drizzle-kit push` for dev.
6. **Gateway calls:** All AI + external tool calls go through `https://api.basicsos.com`. Check `CLAUDE.md` in basicsOS for API docs link.

---

## What to Build First (Session 1 Checklist)

Start here in your first Claude Code session:

```
□ pnpm create next-app@latest . --typescript --tailwind --app
□ Install: drizzle-orm, better-auth, @tanstack/react-query, @phosphor-icons/react, framer-motion, sonner
□ Copy components/ui/ from basicsOS
□ Copy lib/auth.ts, lib/auth-client.ts from basicsOS
□ Copy lib/db/schema.ts from basicsOS, add workspace_apps + app_groups tables
□ Set up app/(auth)/sign-in and sign-up pages
□ Build components/workspace-sidebar.tsx (4 items)
□ Build app/(workspace)/layout.tsx with sidebar
□ Build app/(workspace)/page.tsx — launchpad with hardcoded app grid
□ Build app/(workspace)/shop/page.tsx — stub
□ Build app/(workspace)/agent/page.tsx — stub
□ Build app/(workspace)/context/page.tsx — stub
□ Run pnpm drizzle-kit push, seed default workspace_apps
□ Verify: sign in, see launchpad, click app, navigate, click sidebar items
```

---

## File Reference from basicsOS (what to copy vs port vs rebuild)

| What | Action | basicsOS location |
|------|--------|-------------------|
| Shadcn UI components | Copy directly | `components/ui/` |
| Sidebar primitive | Copy, strip down | `components/ui/sidebar.tsx` |
| Better Auth setup | Copy, update config | `lib/auth.ts`, `lib/auth-client.ts` |
| Drizzle schema (CRM tables) | Copy, extend | `lib/db/schema.ts` or `packages/server/src/db/` |
| Sim executor | Copy verbatim | `packages/server/src/lib/sim/` |
| ConnectionsContent | Port to new design | `components/connections/ConnectionsContent.tsx` |
| Service icons | Copy directly | `components/connections/service-icons.tsx` |
| useRecords, useViews hooks | Copy, update API paths | `src/hooks/` |
| DataTable component | Copy | `src/components/data-table/` |
| Field types registry | Copy | `src/field-types/` |
| ObjectRegistry pattern | Copy, adapt for Next.js | `src/providers/ObjectRegistryProvider.tsx` |
| API connections proxy | Copy | `app/api/connections/` |
| Gateway token handling | Copy | `app/api/gateway-token/` |
| Chat/thread logic | Port | `src/hooks/useGatewayChat.ts` |

---

## Decisions Made

- **No floating windows.** All apps are full-page navigation. Sidebar stays visible for nav back.
- **Automations is the hero app.** It gets the most screen real estate on launchpad.
- **CRM is an app group, not the center.** Contacts/Companies/Deals are sub-apps.
- **Connections live on the launchpad** (bottom half) — they're always visible as fuel.
- **Agent ≠ Automations copilot.** Agent is general OS-level. Automations has its own copilot inside.
- **Context is additive.** Every app writes events. Context reads and displays them all.
- **Onboarding is automations-first.** The goal is to connect tools and set up automations, not configure CRM fields.
- **Shop = templates + apps + connections.** Three tabs, one destination.

---

## Future / V2 Roadmap

- **On Screen Agent** — screen recording → workflow capture → automation replay. Electron-only.
  - Records screen + user actions
  - Converts to replayable automation
  - Available in Shop as installable app
- **RBAC** — scope which apps are visible to which team roles
- **Context Graph view** — D3 relationship visualization
- **Webhook triggers** — external events → automation run
- **Workflow deployment** — publish automation as public API endpoint or embeddable chat widget
- **Mobile app** — React Native wrapper, same backend
- **Custom app builder** — drag-and-drop builder for custom sub-apps (beyond CRM/tasks/notes)
- **Multi-workspace** — one user, multiple company workspaces

---

*Reference: basicsOS at `../basicsOS` (nextjs-plan branch). Gateway API docs: https://basicsos.com/api-docs*

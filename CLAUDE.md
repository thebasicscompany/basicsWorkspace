@AGENTS.md

# basics-workspace — Claude Context

## What This Is

basics-workspace is a company OS desktop/web app. Automations-first. Mac Launchpad-style workspace. Built for teams.

**Read PLAN.md for the full vision, architecture, and implementation phases.**

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4, Radix UI, Framer Motion
- @phosphor-icons/react for all icons
- Drizzle ORM + PostgreSQL (**live** — see `lib/db/`)
- Better Auth (**live** — see `lib/auth.ts`)
- PgBoss (Postgres-native job queue — Phase 2)
- pgvector (semantic search — Phase 2)

## Current Phase

**Phase 0+1 complete. Phase 2 is next.**

- Phase 0: Launchpad, shell, design system ✅
- Phase 1: Auth (Better Auth), DB (Drizzle + Postgres), route groups, logout ✅
- Phase 2: Shared context layer — **read `CONTEXT_ARCHITECTURE.md` before starting**

### Phase 2 overview

`CONTEXT_ARCHITECTURE.md` is the complete blueprint. Key points:
- Four-layer model: Records → Events → Relationships → Embeddings
- All API mutations must call `logContextEvent()` helper
- PgBoss workers handle async: trigger checks, embedding refresh, automation runs
- New Sim block type: Context Query; new Sim trigger: Workspace Context Event
- All LLM/embedding calls go through gateway API (`/api/gateway/`)
- Sim repo is at `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim`

Implementation order: 2A (schema + plumbing) → 2B (standard APIs) → 2C (custom objects) → 2D (automations bridge) → 2E (Context app UI)

## Auth & DB (live — Phase 1 complete)

### Key files
| File | Purpose |
|------|---------|
| `lib/auth.ts` | betterAuth() server instance, drizzleAdapter, emailAndPassword |
| `lib/auth-client.ts` | createAuthClient — exports `signIn`, `signOut`, `signUp`, `useSession` |
| `lib/db/index.ts` | Lazy postgres singleton (globalThis pattern) |
| `lib/db/schema/auth.ts` | Better Auth tables: user, session, account, verification |
| `lib/db/schema/index.ts` | Re-exports all schema modules |
| `drizzle.config.ts` | Drizzle Kit config — loads `.env.local` via dotenv |
| `app/api/auth/[...all]/route.ts` | Better Auth handler: `export const { GET, POST } = toNextJsHandler(auth)` |
| `scripts/seed.ts` | Seeds admin@example.com / admin123 — run with `npx tsx scripts/seed.ts` |

### Route groups
- `app/(auth)/` — no sidebar (login page lives here)
- `app/(workspace)/` — with WorkspaceSidebar, requires auth

### Proxy (auth guard)
`proxy.ts` at project root — **NOT** `middleware.ts` (Next.js 16 renamed it).
Export the function as `proxy`, not `middleware`:
```ts
export function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] }
```
Checks `better-auth.session_token` cookie; redirects unauthenticated → `/login`.
PUBLIC_PATHS: `["/login", "/api/auth"]`

### Docker
`docker-compose.yml` runs **Postgres only** (not the Next.js app).
Port: **5435** (to avoid conflicts). Named volume: `postgres_data`.
Run Next.js locally with `npm run dev`.

---

## App Primitive — the most important convention

Every workspace app (CRM, Automations, Tasks, etc.) follows this structure:

```
apps/
  _types.ts              ← AppManifest interface — never change this without reading it
  _registry.ts           ← INSTALLED_APPS array — add new apps here
  {slug}/
    manifest.ts          ← app metadata satisfying AppManifest
    components/          ← app-specific UI components
    hooks/               ← app-specific data hooks (future)
    schema.ts            ← Drizzle schema additions (future)

app/                     ← Next.js routes only — thin wrappers
  {slug}/
    page.tsx             ← imports from apps/{slug}/, renders AppHeader + content
```

### To add a new app — always follow these steps in order:

1. Create `apps/{slug}/manifest.ts` satisfying `AppManifest` from `@/apps/_types`
2. Add it to `apps/_registry.ts` INSTALLED_APPS array
3. Create `app/{slug}/page.tsx` as a thin Next.js route
4. Put all components in `apps/{slug}/components/`

**The launchpad is data-driven from INSTALLED_APPS. Do not hardcode app tiles.**

### AppManifest shape (see apps/_types.ts for canonical definition):

```ts
{
  slug: string           // matches folder name and route
  name: string           // display name on tile
  href: string           // primary route
  icon: PhosphorIconComponent
  iconColor: string      // tailwind class, e.g. "text-indigo-500"
  iconWeight?: "fill" | "regular"
  subtitle?: string      // e.g. "3 active"
  isGroup?: boolean      // true = shows 2×2 sub-app preview on tile
  subApps?: SubAppManifest[]
  order?: number         // launchpad display order
}
```

## Shell Components (do not modify without good reason)

| Component | File | Purpose |
|-----------|------|---------|
| `WorkspaceSidebar` | `components/workspace-sidebar.tsx` | 4-icon fixed sidebar |
| `AppHeader` | `components/app-header.tsx` | Breadcrumb + actions bar |
| `PageTransition` | `components/page-transition.tsx` | Fade-in wrapper for every page |
| `AppTile` | `components/launchpad/app-tile.tsx` | 72×72px launchpad tile |
| `ConnectionTile` | `components/launchpad/connection-tile.tsx` | Connection service tile |
| `SectionLabel` | `components/section-label.tsx` | Small-caps section header |
| `EmptyState` | `components/ui/empty-state.tsx` | Empty content placeholder |

## Design Tokens (all defined in app/globals.css)

```
--color-bg-base        #F9F7F4  warm cream, page background
--color-bg-surface     #FFFFFF  cards, panels
--color-bg-sidebar     #EFEDE9  sidebar
--color-border         #E4E2DE  default border
--color-text-primary   #18181B
--color-text-secondary #71717A
--color-text-tertiary  #A1A1AA
--color-accent         #2D8653  Basics brand green, CTAs and active states
--color-accent-light   #E6F4ED  light green tint, active nav backgrounds
```

Font: Inter. All sizes are CSS vars. No Geist, no system fonts.

## Sidebar active state rules

- Home (`/`) is active on `/` AND any app route (`/crm`, `/automations`, `/tasks`, etc.)
- Shop, Agent, Context each own their own prefix
- App routes listed in `APP_ROUTES` constant in `components/workspace-sidebar.tsx`

## Every app page must

1. Start with `<AppHeader breadcrumb={[...]} />`
2. Wrap content in `<PageTransition>`
3. Use `style={{ background: "var(--color-bg-base)" }}` on the content div

## Phase 2 discipline — every API mutation must

Call `logContextEvent()` after writing to the DB. This feeds the Events layer, queues PgBoss jobs for trigger checks and embedding refresh. See `CONTEXT_ARCHITECTURE.md` §Layer 2 for the full helper implementation.

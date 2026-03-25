# Shared Context Architecture

> The knowledge graph that powers everything — CRM, Tasks, Automations, Agent, and the Context app all read from and write to this single substrate.

---

## Overview

The shared context is a **living knowledge graph** that gets richer over time. Every entity (contact, deal, task, meeting) is a node. Every action (automation ran, email sent, deal closed) is an event. The AI navigates and reasons over this graph. Humans look at it when they want the full picture.

This is not a database with a shared layer on top. It is the product.

```
┌─────────────────────────────────────────────────────────────────┐
│                        basics-workspace                          │
│                                                                  │
│   CRM ──────────────────────────────────────────────────────┐   │
│   Tasks ────────────────────────────────────────────────┐   │   │
│   Notes ──────────────────────────────────────────────┐ │   │   │
│   Meetings ──────────────────────────────────────── ┐ │ │   │   │
│   Automations ─────────────────────────────────── ┐ │ │ │   │   │
│   Agent ─────────────────────────────────────── ┐ │ │ │ │   │   │
│                                                  │ │ │ │ │   │   │
│                         WRITE                    ▼ ▼ ▼ ▼ ▼   │   │
│   ┌──────────────────────────────────────────────────────┐ │   │
│   │              Shared Context Layer                     │ │   │
│   │                                                       │ │   │
│   │  Layer 1 — Records     (contacts, deals, tasks, ...)  │ │   │
│   │  Layer 2 — Events      (context_events log)           │ │   │
│   │  Layer 3 — Relations   (typed graph edges)            │ │   │
│   │  Layer 4 — Embeddings  (pgvector semantic index)      │ │   │
│   └──────────────────────────────────────────────────────┘ │   │
│                         READ                     ▲ ▲ ▲ ▲ ▲   │   │
│   Context app ───────────────────────────────────┘ │ │ │ │   │   │
│   Agent tools ─────────────────────────────────────┘ │ │ │   │   │
│   Automation Context Query block ─────────────────────┘ │ │   │   │
│   Semantic search ────────────────────────────────────────┘ │   │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Four Layers

### Layer 1 — Records

The nodes of the graph. **Everything — standard objects and custom objects — goes into a single `records` table** backed by `object_config`. There are no separate typed tables for contacts, deals, etc.

**Why unified storage:**
Relationship traversal, Agent tools, Context Query blocks, and semantic search all reference records by `(object_type, id)`. With typed tables, every graph edge traversal requires branching logic: "is this a standard type → join `contacts`, or a custom type → join `records`?" With a single table, traversal is always one join, identical for all types. The performance case for typed tables doesn't apply at this scale, and Postgres generated columns can index frequently-queried JSONB fields if needed later.

```sql
object_config (
  id            uuid PRIMARY KEY,
  org_id        text NOT NULL,
  slug          text NOT NULL,    -- "contacts", "deals", "projects" — matches url path
  name          text NOT NULL,    -- "Contact", "Deal", "Project"
  name_plural   text NOT NULL,    -- "Contacts", "Deals", "Projects"
  icon          text NOT NULL,    -- phosphor icon name
  color         text NOT NULL,    -- tailwind class
  fields        JSONB NOT NULL,   -- ObjectField[]
  is_system     boolean DEFAULT false,  -- true for contacts, deals, tasks, notes, meetings
  position      integer NOT NULL,
  UNIQUE (org_id, slug)
)

records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      text NOT NULL,
  object_type text NOT NULL,   -- matches object_config.slug
  data        JSONB NOT NULL,  -- { "name": "Sarah Chen", "email": "sarah@co.com", ... }
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
)

-- Indexes
INDEX (org_id, object_type, created_at DESC)
CREATE INDEX ON records USING GIN (data)   -- for JSONB field queries
```

**Standard system objects** (seeded into `object_config` on org creation with `is_system = true`):

| slug | Core fields in `data` |
|------|-----------------------|
| `contacts` | firstName, lastName, email, phone, companyId |
| `companies` | name, domain, industry, size |
| `deals` | name, status, amount, companyId, ownerId, closedAt |
| `tasks` | title, status, dueAt, assigneeId, parentType, parentId |
| `notes` | body, authorId, parentType, parentId |
| `meetings` | title, transcript, summary, recordingUrl, startedAt, endedAt |

`parentType` + `parentId` on tasks and notes is a generic reference to any record by `(object_type, id)`. **Convention for cascade deletes:** every DELETE route must also delete orphaned tasks and notes via `WHERE data->>'parentType' = :type AND data->>'parentId' = :id`. A shared `deleteRecord()` helper in `lib/records.ts` should encapsulate this.

**TypeScript interfaces** for standard objects are defined in code (`types/records.ts`) — not in the DB. The DB is schema-less; TypeScript is the schema.

**ObjectField shape** (stored in `object_config.fields`):

```typescript
type ObjectField = {
  id: string
  name: string           // "Deal Value"
  key: string            // "deal_value" — used as JSONB key in data
  type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "multi_select"
    | "relation"         // reference to another object type
    | "checkbox"
    | "url"
    | "email"
    | "phone"
  required: boolean
  options?: { id: string; label: string; color: string }[]  // select/multi_select
  relationTo?: string    // object slug for relation fields
  position: number
}
```

---

### Layer 2 — Events

The write-ahead log. Every mutation in the system appends a row. This table is three things at once:

1. **The timeline** humans see in the Context app
2. **The trigger bus** automations listen to
3. **The history** the AI reasons over

```sql
context_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      text NOT NULL,
  user_id     text,
  source_app  text NOT NULL,   -- "crm" | "automations" | "tasks" | "meetings" | "agent"
  event_type  text NOT NULL,   -- dot-namespaced: "contacts.created", "deals.closed_won"
  entity_type text NOT NULL,   -- object_config slug: "contacts" | "deals" | custom slug
  entity_id   uuid NOT NULL,
  entity_name text,            -- denormalized for display: "Sarah Chen", "Pipeline #2"
  metadata    JSONB,
  created_at  timestamptz DEFAULT now()
)

-- Indexes
INDEX (org_id, created_at DESC)     -- timeline feed
INDEX (entity_type, entity_id)      -- record detail page
INDEX (event_type)                  -- automation trigger matching
```

**Standard event types:**

| Source | Event type |
|--------|-----------|
| crm | `contact.created` `contact.updated` `contact.deleted` |
| crm | `company.created` `company.updated` `company.deleted` |
| crm | `deal.created` `deal.updated` `deal.closed_won` `deal.closed_lost` |
| tasks | `task.created` `task.completed` `task.assigned` |
| notes | `note.created` `note.updated` |
| meetings | `meeting.recorded` `meeting.transcribed` `meeting.summarized` |
| automations | `automation.triggered` `automation.completed` `automation.failed` |
| agent | `agent.conversation_started` |
| context | `object.created` (new custom object type defined) |

---

### Layer 3 — Relationships

Explicit typed graph edges. Not just foreign keys — first-class connections with their own type and metadata. This is what makes the AI actually powerful: it can traverse *contact → deals → meetings about those deals → automations that fired as a result*.

```sql
relationships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  from_type     text NOT NULL,   -- object_config slug, e.g. "contacts"
  from_id       uuid NOT NULL,
  to_type       text NOT NULL,   -- object_config slug, e.g. "deals"
  to_id         uuid NOT NULL,
  relation_type text NOT NULL,   -- see table below
  metadata      JSONB,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (org_id, from_type, from_id, to_type, to_id, relation_type)
)

-- Indexes
INDEX (org_id, from_type, from_id)
INDEX (org_id, to_type, to_id)
```

**Standard relation types:**

| Relation | Example |
|----------|---------|
| `is_in` | contact is_in deal |
| `discussed` | meeting discussed deal |
| `attended` | contact attended meeting |
| `assigned_to` | task assigned_to contact |
| `created_by` | deal created_by user |
| `ran_for` | automation ran_for contact |
| `linked_to` | note linked_to contact |
| `belongs_to` | deal belongs_to company |

New relation types can be added as needed — no schema migration required.

---

### Layer 4 — Semantic Index

pgvector on top of everything. Powers semantic search in the Context app, the agent's `search()` tool, and automation context enrichment.

```sql
-- Requires: CREATE EXTENSION vector;

context_embeddings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  entity_type   text NOT NULL,    -- object_config slug, e.g. "contacts", "deals"
  entity_id     uuid NOT NULL,
  chunk_index   integer NOT NULL DEFAULT 0,  -- 0 for single-chunk entities; 0,1,2... for meetings
  chunk_text    text NOT NULL,    -- the text that was embedded (for display + debugging)
  embedding     vector(1536),     -- dimension matches gateway embedding model; update if model changes
  model         text NOT NULL,    -- gateway model identifier, e.g. "basics-embed-small"
  created_at    timestamptz DEFAULT now(),
  UNIQUE (entity_type, entity_id, chunk_index)
)

-- Standard index
INDEX (entity_type, entity_id)

-- HNSW index for ANN search (added via raw migration after pgvector extension)
CREATE INDEX ON context_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**What gets embedded:**
- Contacts: `"${firstName} ${lastName} ${email} ${company} ${customFields}"`
- Deals: `"${name} ${status} ${amount} ${company} ${customFields}"`
- Notes: full body text
- Meetings: transcript chunks (split at ~500 tokens with overlap)
- Context events: `"${eventType} ${entityName} ${summary}"`

Embeddings go through the **gateway API** (not directly to OpenAI) — vendor-neutral, token tracking, model swapping without code changes.

---

## Infrastructure

### Multi-Tenancy — Org Model

Every piece of workspace data is scoped to an **org** (organisation). Users belong to orgs with roles.

Uses **Better Auth's `organization` plugin** — do not hand-roll this.

```ts
// lib/auth.ts — add to betterAuth() config
import { organization } from "better-auth/plugins"

export const auth = betterAuth({
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      // On signup, auto-create an org for the user:
      sendInvitationEmail: async (data) => { /* Resend via gateway */ },
    })
  ]
})
```

Better Auth automatically adds these tables:
```
organization  (id, name, slug, metadata, createdAt)
member        (id, organizationId, userId, role, createdAt)
invitation    (id, organizationId, email, role, status, expiresAt, inviterId)
```

**Roles:** `owner` | `admin` | `member`. All application data (`records`, `context_events`, `relationships`, `context_embeddings`, `object_config`) uses `org_id` — not `user_id` — as the tenancy key.

**Session → org resolution:** every API route resolves the active org from the session:
```ts
// lib/auth-helpers.ts
export async function requireOrg(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new Response("Unauthorized", { status: 401 })
  const orgId = session.session.activeOrganizationId
  if (!orgId) throw new Response("No active org", { status: 403 })
  return { session, orgId, userId: session.user.id }
}
```

On first login, if the user has no org, redirect to an org-creation screen (name your workspace).

---

### PgBoss (Job Queue)

Postgres-native job queue. No Redis, no extra infra, survives worker restarts, has built-in retries. Upgrade path to BullMQ + Redis when scale demands it — the interface stays the same.

**Three job types:**

```typescript
// 1. Fan-out to matching automation triggers
"check-automation-triggers" {
  eventId: string
  workspaceId: string
  eventType: string      // "deal.closed_won"
  entityType: string
  entityId: string
}

// 2. Refresh embedding for a changed entity
"embed-entity" {
  workspaceId: string
  entityType: string
  entityId: string
}

// 3. Execute a specific automation
"run-automation" {
  workflowId: string
  triggerData: {
    eventType: string
    entityType: string
    entityId: string
    payload: Record<string, unknown>
  }
}
```

### The `logContextEvent` Helper

The single function every mutation calls. It appends the event, queues the automation trigger check, and queues the embedding refresh. Call it at the end of every POST/PATCH/DELETE API route.

```typescript
// lib/context.ts

export async function logContextEvent(event: {
  orgId: string
  userId?: string
  sourceApp: string
  eventType: string
  entityType: string
  entityId: string
  entityName?: string
  metadata?: Record<string, unknown>
}) {
  // 1. Append to event log — awaited (must be durable before we return)
  const [row] = await db
    .insert(contextEvents)
    .values(event)
    .returning()

  // 2 & 3. Queue jobs fire-and-forget — do NOT await.
  // API response time must not be held hostage to queue latency.
  // PgBoss guarantees delivery even if the process crashes immediately after.
  void queue.send("check-automation-triggers", {
    eventId: row.id,
    orgId: event.orgId,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
  })
  void queue.send("embed-entity", {
    orgId: event.orgId,
    entityType: event.entityType,
    entityId: event.entityId,
  })

  return row
}
```

Usage in an API route:

```typescript
// app/api/records/route.ts
export async function POST(req: Request) {
  const { orgId, userId } = await requireOrg(req)
  const { object_type, data } = await req.json()

  const [record] = await db.insert(records).values({
    orgId,
    objectType: object_type,
    data,
  }).returning()

  await logContextEvent({
    orgId,
    userId,
    sourceApp: object_type,   // e.g. "deals", "contacts"
    eventType: `${object_type}.created`,
    entityType: object_type,
    entityId: record.id,
    entityName: data.name ?? data.firstName ?? record.id,
  })

  return Response.json(record)
}
```

### PgBoss Workers — Execution Model

Workers are **long-running Node.js processes** that call `queue.work(...)`. They cannot run inside Next.js serverless functions. Two deployment targets:

**Local / Electron (default)**
The app runs as an Electron desktop app. The Electron **main process** spawns the worker as a child process on app launch:
```ts
// electron/main.ts
import { fork } from "child_process"
const worker = fork("dist/lib/queue/worker-process.js")
app.on("quit", () => worker.kill())
```
PgBoss uses the same local Postgres instance the Next.js dev server connects to. Automations run entirely offline. This is the free tier.

**Hosted / Basics Cloud (paid)**
For teams who don't run the desktop app, or who need automations to fire while the app is closed (24/7 triggers, scheduled runs), Basics Cloud hosts the worker process alongside a managed Postgres instance. This is a separate billed service. The Next.js app points to the cloud DB via `DATABASE_URL`; the cloud worker process runs independently. Implementation deferred — nail local-first first.

```typescript
// lib/queue/workers.ts

// Worker 1 — Automation trigger fan-out
queue.work("check-automation-triggers", async (job) => {
  const { orgId, eventType, entityType, entityId } = job.data

  // Find deployed workflows whose trigger block matches this event type
  const matching = await getWorkflowsWithTrigger(orgId, eventType)

  for (const workflow of matching) {
    await queue.send("run-automation", {
      workflowId: workflow.id,
      triggerData: { eventType, entityType, entityId },
    })
  }
})

// Worker 2 — Embedding refresh
queue.work("embed-entity", async (job) => {
  const { orgId, entityType, entityId } = job.data

  // getEntityChunks returns [{chunkIndex, text}] — one chunk for most types,
  // multiple for meetings (transcript split at ~500 tokens with overlap)
  const chunks = await getEntityChunks(entityType, entityId)

  for (const { chunkIndex, text } of chunks) {
    const embedding = await gatewayEmbedding(text)
    await db
      .insert(contextEmbeddings)
      .values({ orgId, entityType, entityId, chunkIndex, chunkText: text, embedding, model: "basics-embed-small" })
      .onConflictDoUpdate({
        target: [contextEmbeddings.entityType, contextEmbeddings.entityId, contextEmbeddings.chunkIndex],
        set: { chunkText: text, embedding, createdAt: new Date() },
      })
  }
})

// Worker 3 — Run automation
queue.work("run-automation", async (job) => {
  const { workflowId, triggerData } = job.data
  await executeSimWorkflow(workflowId, triggerData)  // Phase 3 — Sim integration
})
```

---

## Automation Integration (Sim)

The automation system is lifted wholesale from [simstudioai/sim](https://github.com/simstudioai/sim): DAG executor, 200+ blocks, React Flow canvas, pause/resume, variable resolver, 50+ triggers.

The one new thing added is the **Context Query block** — the bridge between workspace data and automations.

### Context Query Block

```typescript
// apps/automations/blocks/context-query.ts

{
  type: "context_query",
  name: "Context Query",
  category: "blocks",
  bgColor: "#E6F4ED",
  icon: Graph,   // phosphor
  description: "Query workspace records, relationships, and events",

  subBlocks: [
    {
      id: "entity_type",
      type: "dropdown",
      title: "Entity Type",
      options: ["contacts", "companies", "deals", "tasks", "notes", "meetings"]
      // + custom types from object_config loaded dynamically
    },
    {
      id: "filters",
      type: "filter-builder",
      title: "Filters",
      // e.g. status = "open", amount > 50000
    },
    {
      id: "semantic_query",
      type: "short-input",
      title: "Semantic search",
      placeholder: "e.g. 'contacts interested in enterprise pricing'",
    },
    {
      id: "limit",
      type: "short-input",
      title: "Limit",
      defaultValue: 10,
    },
    {
      id: "include_relationships",
      type: "switch",
      title: "Include relationships",
    },
  ],

  outputs: {
    records: { type: "json", description: "Matching records" },
    total: { type: "number", description: "Total count" },
  },
}
```

**Example workflow using it:**

```
[Trigger: deal.closed_won]
       ↓
[Context Query]
  entity_type: contacts
  filters: is_in deal <trigger.entityId>
       ↓
[Agent Block]
  system: "You are a sales assistant."
  prompt: "Write a personalized thank-you for closing this deal.
           Contacts: <context_query.output.records>"
       ↓
[Gmail Block]
  to: <context_query.output.records[0].email>
  subject: "Thank you"
  body: <agent.output.response>
```

### Workspace Context Trigger

New trigger type — fires when a `context_events` row matches a pattern:

```typescript
// apps/automations/triggers/workspace/context-event.ts
{
  id: "workspace_context_event",
  name: "Workspace Event",
  provider: "workspace",
  description: "Fires when something happens in your workspace",
  subBlocks: [
    { id: "event_type", type: "dropdown",
      options: ["contact.created", "deal.closed_won", "task.completed", /* ... */]
    },
    { id: "entity_filter", type: "filter-builder",
      title: "Only fire when entity matches"
    },
  ],
  outputs: {
    event: {
      eventType: "string",
      entityType: "string",
      entityId: "string",
      entityName: "string",
      metadata: "json",
    }
  }
}
```

This is what enables: *"when a deal is closed won → run this workflow."*

---

## API Surface

### Records (standard objects)

```
GET  /api/contacts                     list, supports ?search= ?filter[field]=
POST /api/contacts                     create + logContextEvent("contact.created")

GET  /api/contacts/:id                 get single + related entities
PATCH /api/contacts/:id                update + logContextEvent("contact.updated")
DELETE /api/contacts/:id               delete + logContextEvent("contact.deleted")

-- Same pattern for /api/companies, /api/deals, /api/tasks, /api/notes, /api/meetings
```

### Custom objects

```
GET  /api/objects                      list object_config
POST /api/objects                      create new custom type (Airtable modal)
GET  /api/objects/:slug                get schema for one type
PATCH /api/objects/:slug               update schema (add/remove fields)
DELETE /api/objects/:slug              delete type (and all records)

GET  /api/objects/:slug/records        list records of this type
POST /api/objects/:slug/records        create record + logContextEvent
GET  /api/objects/:slug/records/:id    get single record
PATCH /api/objects/:slug/records/:id   update + logContextEvent
DELETE /api/objects/:slug/records/:id  delete + logContextEvent
```

### Context (the unified view)

```
GET /api/context/events
  ?workspace_id=
  &source_app=crm,automations
  &event_type=deal.closed_won
  &entity_type=deal&entity_id=
  &from=2024-01-01&to=2024-12-31
  &limit=50&cursor=

GET /api/context/search
  ?q=fundraise+enterprise
  &entity_types=contact,deal,note
  &limit=20
  -- semantic search via pgvector cosine similarity

GET /api/context/timeline/:entityType/:entityId
  -- all events for a single record (the record detail page)

GET /api/context/relationships/:entityType/:entityId
  -- graph edges for a record, optionally recursive
  ?depth=2
```

### Relationships

```
POST /api/relationships                create edge
DELETE /api/relationships/:id          remove edge
GET  /api/relationships?from_type=&from_id=   outbound edges
GET  /api/relationships?to_type=&to_id=       inbound edges
```

---

## Agent Tools

The global Agent sidebar gets these tools, each backed by the context layer:

```typescript
tools = [
  {
    name: "get_records",
    description: "Get records of any type with optional filters",
    params: { entity_type, filters, limit }
  },
  {
    name: "get_record",
    description: "Get a single record by ID including its relationships",
    params: { entity_type, entity_id }
  },
  {
    name: "search",
    description: "Semantic search across all workspace data",
    params: { query, entity_types?, limit? }
  },
  {
    name: "get_timeline",
    description: "Get recent activity for a record or the whole workspace",
    params: { entity_type?, entity_id?, limit? }
  },
  {
    name: "get_relationships",
    description: "Get all entities related to a given record",
    params: { entity_type, entity_id, relation_type? }
  },
  {
    name: "create_record",
    description: "Create a record of any type",
    params: { entity_type, data }
  },
  {
    name: "update_record",
    description: "Update a record",
    params: { entity_type, entity_id, data }
  },
  {
    name: "create_relationship",
    description: "Link two records together",
    params: { from_type, from_id, to_type, to_id, relation_type }
  },
]
```

**Clarification on tool execution:** Agent tools hit the **workspace's own `/api/` routes** — not the external gateway. The gateway (`api.basicsos.com`) is only for LLM inference and embeddings. Tool calls execute as authenticated fetch requests against the Next.js API, which reads/writes the local Postgres DB. The AI model running in the gateway receives tool results and reasons over them, but it never has direct DB access.

---

## Context App — UI Views

The Context app is a read interface over all four layers.

### Timeline View
- Source: `context_events` sorted by `created_at DESC`
- Filterable by source app, event type, entity type, date range
- Each card: app icon + event description + entity link + timestamp
- Infinite scroll via cursor pagination

### Search View
- Source: `context_embeddings` cosine similarity
- Input: natural language query
- Returns: ranked records with excerpts (chunk_text highlight)
- Filterable by entity type post-retrieval

### Record Detail
Any entity page shows:
- The record's fields (from typed table or JSONB)
- Its timeline (`context_events WHERE entity_id = x`)
- Its relationships (`relationships WHERE from_id = x OR to_id = x`)
- Linked automations that ran for it

### Graph View (v2)
- Source: `relationships` table
- Visualization: react-force-graph
- Nodes colored by entity type
- Click node → navigate to record detail
- Expand depth: show 1st-degree then 2nd-degree connections

---

## Gateway API

All AI/embedding calls route through the gateway — not directly to any LLM provider.

**New endpoints needed:**

```
POST /v1/embeddings
  body: { text: string, model?: string }
  returns: { embedding: number[], model: string, tokens: number }

POST /v1/embeddings/batch
  body: { texts: string[], model?: string }
  returns: { embeddings: number[][], model: string, tokens: number }
```

This keeps the embedding pipeline vendor-neutral. Swap underlying model without touching application code.

---

## Drizzle Schema Files

```
lib/db/schema/
├── auth.ts              ← user, session, account, verification, organization, member, invitation (Better Auth managed)
├── objects.ts           ← object_config, records  (all entity types — standard + custom)
├── context.ts           ← context_events, relationships
├── embeddings.ts        ← context_embeddings (pgvector)
├── agent.ts             ← agent_threads, agent_messages  (Phase 5B)
└── index.ts             ← re-exports all
```

Note: there are no separate typed tables (`contacts.ts`, `deals.ts`, etc.). All records live in `objects.ts` → `records` table.

---

## Implementation Order

### Phase 2A — Schema + Plumbing ✅
- [x] Enable Better Auth `organization` plugin, run `drizzle-kit push` for org/member/invitation tables
- [x] Add pgvector extension to Docker postgres
- [x] Write `objects.ts`, `context.ts`, `embeddings.ts` schema files, run `drizzle-kit push`
- [x] Seed system `object_config` rows (contacts, companies, deals, tasks, notes, meetings) on org creation
- [x] Set up PgBoss (`lib/queue.ts`) — local worker process for Electron
- [x] Write `logContextEvent` helper (`lib/context.ts`)
- [x] Write `requireOrg()` auth helper (`lib/auth-helpers.ts`)
- [x] Wire up `embed-entity` worker (calls gateway `/v1/embeddings`)

### Phase 2B — Records API ✅
- [x] Generic CRUD at `/api/records` — all object types use the same routes
- [x] `/api/records?type=contacts&filter[status]=open` list with filter
- [x] `/api/records/:id` get/update/delete (includes cascade-delete of orphaned tasks/notes)
- [x] Each mutation calls `logContextEvent` (fire-and-forget queue sends)
- [x] Relationships API (`/api/relationships`)
- [x] Context events API (`/api/context/events` — timeline feed)

### Phase 2C — Custom Objects
- [ ] `object_config` CRUD (`/api/objects`)
- [ ] Field builder UI (Airtable-style modal) in the Context app
- [ ] Custom types automatically work via the generic records API — no extra routes needed
- [ ] Custom types appear in Context Query block dropdown (reads `object_config`)

### Phase 2D — Record & Context UI ⬤ IN PROGRESS
- [x] `RecordTable` component — Twenty-inspired div-flex grid, column resize, row selection, sticky columns, sort
- [x] `ContactsTable` — contacts-specific column defs (Name, Email, Phone, Company, Status chip, Created)
- [x] Contacts list page (`/crm/contacts`) — live search, filter rule builder (Radix Popover), CSV export
- [x] `useContactsFilter` hook — search + AND-filter logic
- [ ] Wire contacts page to real `/api/records?type=contacts` (currently mock data)
- [ ] Companies list page (`/crm/companies`) — same RecordTable pattern
- [ ] Deals list page (`/crm/deals`) — same pattern, with amount/status columns
- [ ] Record detail page (`/crm/[type]/[id]`) — fields + timeline + relationships panel
- [ ] Context app timeline view (reads `context_events`, infinite scroll)
- [ ] Context app semantic search (pgvector cosine similarity)
- [ ] Graph view — react-force-graph over `relationships` table (v2)

### Phase 3 — Sim / Automations Engine
**This is a large, standalone effort — budget 2–3 weeks separately.**
- [ ] Audit Sim codebase at `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim` — catalogue dependencies, DB schema, block registry
- [ ] Port Sim executor into `apps/automations/` — resolve import paths, adapt DB connections
- [ ] Port React Flow canvas and block UI
- [ ] Register Context Query block (new — reads the context layer)
- [ ] Register Workspace Context Event trigger (new — listens to `context_events`)
- [ ] `check-automation-triggers` worker → fan-out to matching workflows
- [ ] `run-automation` worker → Sim executor

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| All records in one table | Unified `records` + `object_config` | Relationship traversal, agent tools, and context queries work identically for standard and custom objects. No branching logic. Typed tables would save SQL verbosity but add graph complexity — wrong tradeoff for an AI-first product. |
| Multi-tenancy | Better Auth `organization` plugin | Avoids hand-rolling org/member/invitation — Better Auth handles it natively. All data scoped to `org_id`. |
| Worker execution | Electron main process (local) / separate service (cloud) | Local-first: workers run free in the Electron shell with no extra infra. Cloud tier charges for hosted 24/7 automation execution. |
| Job queue | PgBoss | Postgres-native, no extra infra, survives restarts, has retries. `void queue.send()` keeps API routes fast. Swap to BullMQ + Redis when scale demands. |
| Embedding calls | Gateway API (`/v1/embeddings`) | Vendor-neutral. One place to swap models, track tokens, handle auth. |
| Chunk embeddings | `(entity_type, entity_id, chunk_index)` unique | Single chunk for most types (index 0); meetings chunk transcripts into multiple rows. Conflict target includes `chunk_index`. |
| Event granularity (v1) | Entity-level only | "deal.updated" not "deal.amount changed from $50k to $75k". Add field-level diffs in v2. |
| Relationship model | Explicit typed table | First-class graph edges enable AI traversal. FK-only approach loses relationship semantics. |
| Trigger delivery | PgBoss fan-out | Sub-second from event to automation trigger. Postgres-native, no polling. |
| Embeddings | Day 1 | Every record gets embedded on write. Semantic search is too central to add later. |
| Automation engine | Sim (Phase 3, separate effort) | Production-grade DAG executor. Port, don't rebuild. Budget 2–3 weeks standalone. |
| Agent tool execution | Workspace `/api/` routes | Tools hit the app's own API — not the gateway. The gateway is LLM-only. |

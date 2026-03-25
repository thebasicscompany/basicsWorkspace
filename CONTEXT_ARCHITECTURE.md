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

The nodes of the graph. Standard objects get typed tables (fast, relational, SQL-native). Custom objects users create (Airtable-style) go in a flexible `records` table backed by `object_config`.

**Standard objects** — typed tables:

| Table | Key fields |
|-------|-----------|
| `contacts` | firstName, lastName, email, phone, companyId, customFields JSONB |
| `companies` | name, domain, industry, size, customFields JSONB |
| `deals` | name, status, amount, companyId, ownerId, closedAt, customFields JSONB |
| `tasks` | title, status, dueAt, assigneeId, parentType, parentId, customFields JSONB |
| `notes` | body, authorId, parentType, parentId |
| `meetings` | title, transcript, summary, recordingUrl, startedAt, endedAt |

`parentType` + `parentId` on tasks and notes is a generic reference — a task can belong to a contact, deal, company, or any custom object.

`customFields JSONB` on standard tables allows power users to add ad-hoc fields without needing a custom object type.

**Custom objects** — flexible schema:

```sql
object_config (
  id, workspace_id,
  slug,           -- "projects", "leads", "invoices" — matches url path
  name,           -- "Project"
  name_plural,    -- "Projects"
  icon,           -- phosphor icon name
  color,          -- tailwind class
  fields JSONB,   -- ObjectField[] — the Airtable-style field definitions
  is_system,      -- true for built-in objects (contacts, deals, etc.)
  position
)

records (
  id, workspace_id,
  object_type,    -- matches object_config.slug
  data JSONB,     -- { "name": "Project Alpha", "status": "active", ... }
  created_at, updated_at
)
```

**ObjectField shape** (stored in `object_config.fields`):

```typescript
type ObjectField = {
  id: string
  name: string           // "Deal Value"
  key: string            // "deal_value" — used as JSONB key
  type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "multi_select"
    | "relation"         // FK to another object
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
  id, workspace_id, user_id,
  source_app,    -- "crm" | "automations" | "tasks" | "meetings" | "agent"
  event_type,    -- dot-namespaced: "contact.created", "deal.closed", "automation.completed"
  entity_type,   -- "contact" | "deal" | "task" | custom slug
  entity_id,
  entity_name,   -- "Sarah Chen", "Pipeline #2" — denormalized for display
  metadata JSONB,
  created_at
)

-- Indexes
INDEX (workspace_id, created_at DESC)   -- timeline feed
INDEX (entity_type, entity_id)          -- record detail page
INDEX (event_type)                      -- automation trigger matching
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
  id, workspace_id,
  from_type,      -- "contact"
  from_id,        -- "abc123"
  to_type,        -- "deal"
  to_id,          -- "xyz789"
  relation_type,  -- see table below
  metadata JSONB,
  created_at
)

-- Indexes
INDEX (from_type, from_id)
INDEX (to_type, to_id)
UNIQUE (from_type, from_id, to_type, to_id, relation_type)
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
  id, workspace_id,
  entity_type,    -- "contact" | "deal" | "note" | custom slug
  entity_id,
  chunk_text,     -- the text that was embedded (for display + debugging)
  embedding       vector(1536),
  model,          -- gateway model identifier
  created_at
)

-- Standard index
INDEX (entity_type, entity_id)

-- HNSW index for ANN search (added via raw migration)
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
  workspaceId: string
  userId?: string
  sourceApp: string
  eventType: string
  entityType: string
  entityId: string
  entityName?: string
  metadata?: Record<string, unknown>
}) {
  // 1. Append to event log
  const [row] = await db
    .insert(contextEvents)
    .values(event)
    .returning()

  // 2. Queue: check automation triggers
  await queue.send("check-automation-triggers", {
    eventId: row.id,
    workspaceId: event.workspaceId,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
  })

  // 3. Queue: refresh embedding
  await queue.send("embed-entity", {
    workspaceId: event.workspaceId,
    entityType: event.entityType,
    entityId: event.entityId,
  })

  return row
}
```

Usage in an API route:

```typescript
// app/api/deals/route.ts
export async function POST(req: Request) {
  const session = await requireSession()
  const body = await req.json()

  const [deal] = await db.insert(deals).values({
    ...body,
    workspaceId: session.workspaceId,
  }).returning()

  await logContextEvent({
    workspaceId: session.workspaceId,
    userId: session.userId,
    sourceApp: "crm",
    eventType: "deal.created",
    entityType: "deal",
    entityId: deal.id,
    entityName: deal.name,
  })

  return Response.json(deal)
}
```

### PgBoss Workers

```typescript
// lib/queue/workers.ts

// Worker 1 — Automation trigger fan-out
queue.work("check-automation-triggers", async (job) => {
  const { workspaceId, eventType, entityType, entityId } = job.data

  // Find deployed workflows whose trigger block matches this event type
  const matching = await getWorkflowsWithTrigger(workspaceId, eventType)

  for (const workflow of matching) {
    await queue.send("run-automation", {
      workflowId: workflow.id,
      triggerData: { eventType, entityType, entityId },
    })
  }
})

// Worker 2 — Embedding refresh
queue.work("embed-entity", async (job) => {
  const { workspaceId, entityType, entityId } = job.data

  const text = await getEntityText(entityType, entityId)
  const embedding = await gatewayEmbedding(text)

  await db
    .insert(contextEmbeddings)
    .values({ workspaceId, entityType, entityId, chunkText: text, embedding, model: "text-embedding-3-small" })
    .onConflictDoUpdate({
      target: [contextEmbeddings.entityType, contextEmbeddings.entityId],
      set: { chunkText: text, embedding, createdAt: new Date() },
    })
})

// Worker 3 — Run automation
queue.work("run-automation", async (job) => {
  const { workflowId, triggerData } = job.data
  await executeSimWorkflow(workflowId, triggerData)
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

Every tool call goes through the **gateway API** — the agent never hits the DB directly.

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
├── auth.ts              ← user, session, account, verification (exists)
├── records.ts           ← contacts, companies, deals, tasks, notes, meetings
├── objects.ts           ← object_config, records (custom types)
├── context.ts           ← context_events, relationships
├── embeddings.ts        ← context_embeddings (pgvector)
└── index.ts             ← re-exports all
```

---

## Implementation Order

### Phase 2A — Schema + Plumbing (Week 1)
- [ ] Add pgvector extension to Docker postgres
- [ ] Write all schema files, run `drizzle-kit push`
- [ ] Set up PgBoss (`lib/queue.ts`)
- [ ] Write `logContextEvent` helper (`lib/context.ts`)
- [ ] Add `/v1/embeddings` endpoint to gateway
- [ ] Wire up `embed-entity` worker

### Phase 2B — Standard Object APIs (Week 2)
- [ ] CRUD routes for contacts, companies, deals, tasks, notes, meetings
- [ ] Each mutation calls `logContextEvent`
- [ ] Relationships API
- [ ] Context events API (timeline feed)

### Phase 2C — Custom Objects (Week 3)
- [ ] `object_config` CRUD
- [ ] Field builder UI (Airtable-style modal)
- [ ] `/api/objects/[slug]/records` dynamic CRUD
- [ ] Custom object types appear in Context Query block dropdown

### Phase 2D — Automations Bridge (Week 4)
- [ ] Lift Sim executor into `apps/automations/`
- [ ] Register Context Query block
- [ ] Register Workspace Context Event trigger
- [ ] `check-automation-triggers` worker
- [ ] `run-automation` worker → Sim executor

### Phase 2E — Context App UI (Week 5)
- [ ] Timeline view (reads `context_events`)
- [ ] Semantic search (reads `context_embeddings` via pgvector)
- [ ] Record detail page with timeline + relationships
- [ ] Graph view (v2 — react-force-graph over `relationships`)

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Custom object storage | JSONB in `records` table | No schema migrations when users add fields. Trade-off (less SQL-native querying) acceptable for AI-first product where queries go through tools anyway. |
| Job queue | PgBoss | Postgres-native, no extra infra, survives restarts, has retries. Swap to BullMQ + Redis when scale demands. |
| Embedding calls | Gateway API | Vendor-neutral. One place to swap models, track tokens, handle auth. |
| Event granularity (v1) | Entity-level only | "deal.updated" not "deal.amount changed from $50k to $75k". Add field-level diffs in v2 when the event schema is proven. |
| Relationship model | Explicit typed table | First-class graph edges enable AI traversal. FK-only approach loses the semantics (why are these connected? what type of connection?). |
| Trigger delivery | PgBoss fan-out | Real-time (sub-second from event to automation trigger). Postgres-native. No polling latency. |
| Embeddings | Day 1 | Every record and event gets embedded on write. Semantic search is too central to the AI experience to add later. |
| Automation engine | Sim (lifted wholesale) | Production-grade DAG executor with 200+ blocks, pause/resume, 50+ triggers. Don't rebuild this. |

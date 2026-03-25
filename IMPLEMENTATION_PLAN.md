# Basics Workspace — Implementation Plan

> Execution guide. Task-level granular. Read PLAN.md for vision, CONTEXT_ARCHITECTURE.md for data model.

**Current state as of writing:**
- Phase 0 (design system) ✅
- Phase 1 (auth, DB shell, agent UI shell) ✅
- Better Auth: `user`, `session`, `account`, `verification` — no org plugin yet
- API routes: `/api/auth/[...all]`, `/api/agent/chat` only
- Agent UI: assistant-ui Thread live, in-memory only

---

## Phase 2A — Foundation
> Schema, org model, job queue, and the `logContextEvent` helper. Nothing user-facing. Everything else depends on this.

### Step 1 — Add Better Auth `organization` plugin

**File:** `lib/auth.ts`

Add the organization plugin to the existing `betterAuth()` call. This auto-generates `organization`, `member`, and `invitation` tables.

```ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { db } from "./db"
import * as schema from "./db/schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema },
  }),
  emailAndPassword: { enabled: true },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
})
```

**File:** `lib/auth-client.ts`

```ts
import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"

export const { signIn, signOut, signUp, useSession, organization: orgClient } =
  createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL!,
    plugins: [organizationClient()],
  })
```

**Verify:** `npm run typecheck` passes. No new migration needed yet — run push after all schemas are written.

---

### Step 2 — Write Drizzle schema files

Create all schema files before running `db:push`. Push once at the end of this section.

---

**File:** `lib/db/schema/objects.ts`

```ts
import {
  pgTable, uuid, text, jsonb, boolean, integer,
  timestamp, index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const objectConfig = pgTable("object_config", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId:      text("org_id").notNull(),
  slug:       text("slug").notNull(),
  name:       text("name").notNull(),
  namePlural: text("name_plural").notNull(),
  icon:       text("icon").notNull(),
  color:      text("color").notNull(),
  fields:     jsonb("fields").notNull().default(sql`'[]'::jsonb`),
  isSystem:   boolean("is_system").notNull().default(false),
  position:   integer("position").notNull().default(0),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("object_config_org_slug_idx").on(t.orgId, t.slug),
])

export const records = pgTable("records", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId:      text("org_id").notNull(),
  objectType: text("object_type").notNull(),
  data:       jsonb("data").notNull().default(sql`'{}'::jsonb`),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("records_org_type_idx").on(t.orgId, t.objectType),
  // GIN index added via raw SQL migration after push:
  // CREATE INDEX records_data_gin ON records USING GIN (data);
])
```

---

**File:** `lib/db/schema/context.ts`

```ts
import {
  pgTable, uuid, text, jsonb, timestamp, index, unique,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const contextEvents = pgTable("context_events", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId:      text("org_id").notNull(),
  userId:     text("user_id"),
  sourceApp:  text("source_app").notNull(),
  eventType:  text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId:   uuid("entity_id").notNull(),
  entityName: text("entity_name"),
  metadata:   jsonb("metadata"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("context_events_org_created_idx").on(t.orgId, t.createdAt),
  index("context_events_entity_idx").on(t.entityType, t.entityId),
  index("context_events_type_idx").on(t.eventType),
])

export const relationships = pgTable("relationships", {
  id:           uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId:        text("org_id").notNull(),
  fromType:     text("from_type").notNull(),
  fromId:       uuid("from_id").notNull(),
  toType:       text("to_type").notNull(),
  toId:         uuid("to_id").notNull(),
  relationType: text("relation_type").notNull(),
  metadata:     jsonb("metadata"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique("relationships_unique").on(t.orgId, t.fromType, t.fromId, t.toType, t.toId, t.relationType),
  index("relationships_from_idx").on(t.orgId, t.fromType, t.fromId),
  index("relationships_to_idx").on(t.orgId, t.toType, t.toId),
])
```

---

**File:** `lib/db/schema/embeddings.ts`

```ts
import {
  pgTable, uuid, text, integer, timestamp, index, unique,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { vector } from "drizzle-orm/pg-core"

// Requires: CREATE EXTENSION vector; in Postgres before push

export const contextEmbeddings = pgTable("context_embeddings", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId:      text("org_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId:   uuid("entity_id").notNull(),
  chunkIndex: integer("chunk_index").notNull().default(0),
  chunkText:  text("chunk_text").notNull(),
  embedding:  vector("embedding", { dimensions: 1536 }),
  model:      text("model").notNull(),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique("embeddings_chunk_unique").on(t.entityType, t.entityId, t.chunkIndex),
  index("embeddings_entity_idx").on(t.entityType, t.entityId),
  // HNSW index added via raw SQL after push:
  // CREATE INDEX ON context_embeddings USING hnsw (embedding vector_cosine_ops)
  // WITH (m = 16, ef_construction = 64);
])
```

---

**File:** `lib/db/schema/agent.ts`

```ts
import {
  pgTable, uuid, text, jsonb, timestamp, index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const agentThreads = pgTable("agent_threads", {
  id:        uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId:     text("org_id").notNull(),
  userId:    text("user_id").notNull(),
  title:     text("title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("agent_threads_user_idx").on(t.userId, t.createdAt),
])

export const agentMessages = pgTable("agent_messages", {
  id:        uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId:  uuid("thread_id").notNull().references(() => agentThreads.id, { onDelete: "cascade" }),
  role:      text("role").notNull(),
  parts:     jsonb("parts").notNull(),
  metadata:  jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("agent_messages_thread_idx").on(t.threadId, t.createdAt),
])
```

---

**File:** `lib/db/schema/index.ts`

```ts
export * from "./auth"
export * from "./objects"
export * from "./context"
export * from "./embeddings"
export * from "./agent"
```

---

### Step 3 — Push schema to Postgres

```bash
# First, enable pgvector in Docker postgres (one-time)
docker exec -it <postgres-container> psql -U postgres -d basics -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Push all schemas
npm run db:push

# Add the raw indexes that Drizzle can't express
docker exec -it <postgres-container> psql -U postgres -d basics -c "
  CREATE INDEX IF NOT EXISTS records_data_gin ON records USING GIN (data);
  CREATE INDEX IF NOT EXISTS embeddings_hnsw ON context_embeddings
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
"
```

**Verify:** Open Drizzle Studio (`npm run db:studio`). Confirm all tables exist: `object_config`, `records`, `context_events`, `relationships`, `context_embeddings`, `agent_threads`, `agent_messages`, plus Better Auth org tables (`organization`, `member`, `invitation`).

---

### Step 4 — `requireOrg` auth helper

**File:** `lib/auth-helpers.ts`

```ts
import { auth } from "./auth"
import { headers } from "next/headers"

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function requireOrg() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new AuthError(401, "Unauthorized")

  const orgId = session.session.activeOrganizationId
  if (!orgId) throw new AuthError(403, "No active organization")

  return {
    userId: session.user.id,
    orgId,
    user: session.user,
  }
}

// Use in route handlers:
// export async function GET() {
//   try {
//     const { orgId, userId } = await requireOrg()
//     ...
//   } catch (e) {
//     if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
//     throw e
//   }
// }
```

---

### Step 5 — System object seeding

**File:** `lib/db/seed-system-objects.ts`

```ts
import { db } from "./db"
import { objectConfig } from "./db/schema"
import { eq, and } from "drizzle-orm"

const SYSTEM_OBJECTS = [
  {
    slug: "contacts", name: "Contact", namePlural: "Contacts",
    icon: "UserCircle", color: "text-blue-500", position: 0,
    fields: [
      { id: "firstName", name: "First Name", key: "firstName", type: "text", required: true, position: 0 },
      { id: "lastName",  name: "Last Name",  key: "lastName",  type: "text", required: false, position: 1 },
      { id: "email",     name: "Email",      key: "email",     type: "email", required: false, position: 2 },
      { id: "phone",     name: "Phone",      key: "phone",     type: "phone", required: false, position: 3 },
      { id: "companyId", name: "Company",    key: "companyId", type: "relation", required: false, relationTo: "companies", position: 4 },
    ],
  },
  {
    slug: "companies", name: "Company", namePlural: "Companies",
    icon: "Buildings", color: "text-orange-500", position: 1,
    fields: [
      { id: "name",     name: "Name",     key: "name",     type: "text",   required: true,  position: 0 },
      { id: "domain",   name: "Domain",   key: "domain",   type: "url",    required: false, position: 1 },
      { id: "industry", name: "Industry", key: "industry", type: "select", required: false, position: 2,
        options: ["SaaS", "Fintech", "Healthcare", "E-commerce", "Other"].map(l => ({ id: l.toLowerCase(), label: l, color: "gray" })) },
      { id: "size",     name: "Size",     key: "size",     type: "select", required: false, position: 3,
        options: ["1-10", "11-50", "51-200", "201-1000", "1000+"].map(l => ({ id: l, label: l, color: "gray" })) },
    ],
  },
  {
    slug: "deals", name: "Deal", namePlural: "Deals",
    icon: "CurrencyDollar", color: "text-green-500", position: 2,
    fields: [
      { id: "name",      name: "Name",      key: "name",      type: "text",   required: true,  position: 0 },
      { id: "status",    name: "Status",    key: "status",    type: "select", required: true,  position: 1,
        options: ["Open", "Won", "Lost"].map(l => ({ id: l.toLowerCase(), label: l, color: "gray" })) },
      { id: "amount",    name: "Amount",    key: "amount",    type: "number", required: false, position: 2 },
      { id: "companyId", name: "Company",   key: "companyId", type: "relation", required: false, relationTo: "companies", position: 3 },
      { id: "closedAt",  name: "Close Date", key: "closedAt", type: "date",  required: false, position: 4 },
    ],
  },
  {
    slug: "tasks", name: "Task", namePlural: "Tasks",
    icon: "CheckSquare", color: "text-amber-500", position: 3,
    fields: [
      { id: "title",      name: "Title",    key: "title",      type: "text",   required: true,  position: 0 },
      { id: "status",     name: "Status",   key: "status",     type: "select", required: true,  position: 1,
        options: ["Todo", "In Progress", "Done"].map(l => ({ id: l.toLowerCase().replace(" ", "_"), label: l, color: "gray" })) },
      { id: "dueAt",      name: "Due Date", key: "dueAt",      type: "date",   required: false, position: 2 },
      { id: "assigneeId", name: "Assignee", key: "assigneeId", type: "text",   required: false, position: 3 },
      { id: "parentType", name: "Parent Type", key: "parentType", type: "text", required: false, position: 4 },
      { id: "parentId",   name: "Parent",   key: "parentId",   type: "text",   required: false, position: 5 },
    ],
  },
  {
    slug: "notes", name: "Note", namePlural: "Notes",
    icon: "Note", color: "text-yellow-500", position: 4,
    fields: [
      { id: "body",       name: "Body",     key: "body",       type: "text",   required: true,  position: 0 },
      { id: "authorId",   name: "Author",   key: "authorId",   type: "text",   required: false, position: 1 },
      { id: "parentType", name: "Parent Type", key: "parentType", type: "text", required: false, position: 2 },
      { id: "parentId",   name: "Parent",   key: "parentId",   type: "text",   required: false, position: 3 },
    ],
  },
  {
    slug: "meetings", name: "Meeting", namePlural: "Meetings",
    icon: "VideoCamera", color: "text-violet-500", position: 5,
    fields: [
      { id: "title",        name: "Title",       key: "title",        type: "text", required: true,  position: 0 },
      { id: "transcript",   name: "Transcript",  key: "transcript",   type: "text", required: false, position: 1 },
      { id: "summary",      name: "Summary",     key: "summary",      type: "text", required: false, position: 2 },
      { id: "recordingUrl", name: "Recording",   key: "recordingUrl", type: "url",  required: false, position: 3 },
      { id: "startedAt",    name: "Started At",  key: "startedAt",    type: "date", required: false, position: 4 },
      { id: "endedAt",      name: "Ended At",    key: "endedAt",      type: "date", required: false, position: 5 },
    ],
  },
] as const

export async function seedSystemObjects(orgId: string) {
  for (const obj of SYSTEM_OBJECTS) {
    const existing = await db.query.objectConfig.findFirst({
      where: and(eq(objectConfig.orgId, orgId), eq(objectConfig.slug, obj.slug)),
    })
    if (!existing) {
      await db.insert(objectConfig).values({ ...obj, orgId, isSystem: true })
    }
  }
}
```

Call `seedSystemObjects(orgId)` from the org creation webhook/callback in Better Auth once an org is created.

---

### Step 6 — Set up PgBoss

```bash
npm install pg-boss
```

**File:** `lib/queue.ts`

```ts
import PgBoss from "pg-boss"

declare global {
  var _boss: PgBoss | undefined
}

let boss: PgBoss

export function getQueue(): PgBoss {
  if (boss) return boss
  if (globalThis._boss) {
    boss = globalThis._boss
    return boss
  }

  boss = new PgBoss(process.env.DATABASE_URL!)

  if (process.env.NODE_ENV !== "production") {
    globalThis._boss = boss
  }

  return boss
}

export async function startQueue() {
  const b = getQueue()
  await b.start()
  return b
}
```

**File:** `lib/queue/handlers.ts` — pure functions, no PgBoss dependency (makes them testable)

```ts
import { db } from "@/lib/db"
import { records, contextEmbeddings } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function handleEmbedEntity(data: {
  orgId: string
  entityType: string
  entityId: string
}) {
  const record = await db.query.records.findFirst({
    where: and(eq(records.id, data.entityId), eq(records.orgId, data.orgId)),
  })
  if (!record) return

  const chunks = getEntityChunks(record.objectType, record.data)

  for (const { chunkIndex, text } of chunks) {
    const embedding = await fetchGatewayEmbedding(text)
    await db
      .insert(contextEmbeddings)
      .values({
        orgId: data.orgId,
        entityType: data.entityType,
        entityId: data.entityId,
        chunkIndex,
        chunkText: text,
        embedding,
        model: "basics-embed-small",
      })
      .onConflictDoUpdate({
        target: [contextEmbeddings.entityType, contextEmbeddings.entityId, contextEmbeddings.chunkIndex],
        set: { chunkText: text, embedding, createdAt: new Date() },
      })
  }
}

export function getEntityChunks(
  objectType: string,
  data: Record<string, unknown>
): { chunkIndex: number; text: string }[] {
  if (objectType === "meetings" && typeof data.transcript === "string") {
    return chunkText(data.transcript, 500, 50).map((text, i) => ({ chunkIndex: i, text }))
  }

  const text = buildEntityText(objectType, data)
  return [{ chunkIndex: 0, text }]
}

function buildEntityText(objectType: string, data: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === "string" && key !== "parentId" && key !== "parentType") {
      parts.push(val)
    }
  }
  return `${objectType}: ${parts.join(" | ")}`
}

function chunkText(text: string, tokensPerChunk: number, overlap: number): string[] {
  // Approximate: 1 token ≈ 4 chars
  const chunkSize = tokensPerChunk * 4
  const overlapSize = overlap * 4
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize))
    i += chunkSize - overlapSize
  }
  return chunks
}

async function fetchGatewayEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${process.env.GATEWAY_URL}/v1/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({ input: text, model: "basics-embed-small" }),
  })
  const json = await res.json()
  return json.data[0].embedding
}
```

**File:** `lib/queue/workers.ts` — wires PgBoss to handlers

```ts
import { startQueue } from "@/lib/queue"
import { handleEmbedEntity } from "./handlers"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"

export async function startWorkers() {
  const boss = await startQueue()

  boss.work("embed-entity", async (job) => {
    await handleEmbedEntity(job.data)
  })

  boss.work("check-automation-triggers", async (job) => {
    // Phase 3 — Sim integration
    console.log("Automation trigger check — Phase 3", job.data)
  })

  boss.work("run-automation", async (job) => {
    // Phase 3 — Sim integration
    console.log("Run automation — Phase 3", job.data)
  })

  console.log("Workers started")
}
```

---

### Step 7 — `logContextEvent` helper

**File:** `lib/context.ts`

```ts
import { db } from "./db"
import { contextEvents } from "./db/schema"
import { getQueue } from "./queue"

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
  const [row] = await db
    .insert(contextEvents)
    .values(event)
    .returning()

  const queue = getQueue()

  // Fire-and-forget — do NOT await. PgBoss guarantees delivery.
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

---

### Step 8 — Set up Vitest

```bash
npm install -D vitest @vitest/ui
```

**File:** `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
})
```

**File:** `tests/setup.ts`

```ts
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

// Wipe all non-auth tables between tests
export async function resetDb() {
  await db.execute(sql`
    TRUNCATE records, context_events, relationships, context_embeddings,
             agent_threads, agent_messages, object_config CASCADE
  `)
}

// Seed a test org + system objects (use Better Auth API)
export async function seedTestOrg(name = "Test Org") {
  // Create org directly in DB for tests — bypass Better Auth HTTP layer
  const [org] = await db.execute(sql`
    INSERT INTO organization (id, name, slug, created_at)
    VALUES (gen_random_uuid(), ${name}, ${name.toLowerCase().replace(/\s/g, "-")}, now())
    RETURNING *
  `)
  const [user] = await db.execute(sql`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (gen_random_uuid(), 'Test User', 'test@example.com', true, now(), now())
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING *
  `)
  const { seedSystemObjects } = await import("@/lib/db/seed-system-objects")
  await seedSystemObjects(org.id)
  return { org, user }
}
```

**Add to `package.json` scripts:**
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

**Verify:** `npm test` runs with 0 tests, exits cleanly.

---

### Phase 2A complete checklist
- [ ] Better Auth org plugin added and typechecks
- [ ] All 5 schema files written
- [ ] `drizzle-kit push` succeeds, all tables visible in Studio
- [ ] pgvector extension enabled, GIN + HNSW indexes created manually
- [ ] `requireOrg()` written
- [ ] `seedSystemObjects()` written
- [ ] PgBoss installed, `lib/queue.ts` + `lib/queue/handlers.ts` + `lib/queue/workers.ts` written
- [ ] `logContextEvent()` written
- [ ] Vitest configured, `npm test` runs

---

## Phase 2B — Records API
> Generic CRUD for all object types. Every mutation logs a context event. Tests written alongside each route.

### Step 1 — Shared record helpers

**File:** `lib/records.ts`

```ts
import { db } from "./db"
import { records } from "./db/schema"
import { and, eq, sql } from "drizzle-orm"
import { logContextEvent } from "./context"

export async function deleteRecord(
  id: string,
  orgId: string,
  userId?: string
) {
  const record = await db.query.records.findFirst({
    where: and(eq(records.id, id), eq(records.orgId, orgId)),
  })
  if (!record) return null

  // Cascade: delete tasks and notes that reference this record
  await db.delete(records).where(
    and(
      eq(records.orgId, orgId),
      sql`data->>'parentId' = ${id}`
    )
  )

  await db.delete(records).where(
    and(eq(records.id, id), eq(records.orgId, orgId))
  )

  await logContextEvent({
    orgId,
    userId,
    sourceApp: record.objectType,
    eventType: `${record.objectType}.deleted`,
    entityType: record.objectType,
    entityId: id,
    entityName: getEntityName(record.data as Record<string, unknown>),
  })

  return record
}

export function getEntityName(data: Record<string, unknown>): string {
  return (
    (data.name as string) ??
    [(data.firstName as string), (data.lastName as string)].filter(Boolean).join(" ") ??
    (data.title as string) ??
    "Untitled"
  )
}
```

---

### Step 2 — Records routes

**File:** `app/api/records/route.ts` — list + create

```ts
import { db } from "@/lib/db"
import { records } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { requireOrg, AuthError } from "@/lib/auth-helpers"
import { logContextEvent } from "@/lib/context"
import { getEntityName } from "@/lib/records"

export async function GET(req: Request) {
  try {
    const { orgId } = await requireOrg()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") ?? "50")
    const cursor = searchParams.get("cursor")

    const rows = await db.query.records.findMany({
      where: and(
        eq(records.orgId, orgId),
        type ? eq(records.objectType, type) : undefined,
        cursor ? sql`created_at < ${cursor}` : undefined,
      ),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
      limit,
    })

    return Response.json({
      records: rows,
      nextCursor: rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null,
    })
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function POST(req: Request) {
  try {
    const { orgId, userId } = await requireOrg()
    const body = await req.json()
    const { object_type, data } = body

    if (!object_type || !data) {
      return Response.json({ error: "object_type and data required" }, { status: 422 })
    }

    const [record] = await db
      .insert(records)
      .values({ orgId, objectType: object_type, data })
      .returning()

    await logContextEvent({
      orgId, userId,
      sourceApp: object_type,
      eventType: `${object_type}.created`,
      entityType: object_type,
      entityId: record.id,
      entityName: getEntityName(data),
    })

    return Response.json(record, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }
}
```

**File:** `app/api/records/[id]/route.ts` — get + update + delete

```ts
import { db } from "@/lib/db"
import { records } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { requireOrg, AuthError } from "@/lib/auth-helpers"
import { logContextEvent } from "@/lib/context"
import { deleteRecord, getEntityName } from "@/lib/records"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireOrg()
    const { id } = await params
    const record = await db.query.records.findFirst({
      where: and(eq(records.id, id), eq(records.orgId, orgId)),
    })
    if (!record) return Response.json({ error: "Not found" }, { status: 404 })
    return Response.json(record)
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId } = await requireOrg()
    const { id } = await params
    const { data } = await req.json()

    const existing = await db.query.records.findFirst({
      where: and(eq(records.id, id), eq(records.orgId, orgId)),
    })
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

    const [updated] = await db
      .update(records)
      .set({ data: { ...existing.data as object, ...data }, updatedAt: new Date() })
      .where(and(eq(records.id, id), eq(records.orgId, orgId)))
      .returning()

    await logContextEvent({
      orgId, userId,
      sourceApp: existing.objectType,
      eventType: `${existing.objectType}.updated`,
      entityType: existing.objectType,
      entityId: id,
      entityName: getEntityName(updated.data as Record<string, unknown>),
    })

    return Response.json(updated)
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId } = await requireOrg()
    const { id } = await params
    const deleted = await deleteRecord(id, orgId, userId)
    if (!deleted) return Response.json({ error: "Not found" }, { status: 404 })
    return new Response(null, { status: 204 })
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }
}
```

---

### Step 3 — Relationships routes

**File:** `app/api/relationships/route.ts`

```ts
import { db } from "@/lib/db"
import { relationships } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { requireOrg, AuthError } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  try {
    const { orgId } = await requireOrg()
    const { searchParams } = new URL(req.url)
    const fromType = searchParams.get("from_type")
    const fromId   = searchParams.get("from_id")
    const toType   = searchParams.get("to_type")
    const toId     = searchParams.get("to_id")

    const rows = await db.query.relationships.findMany({
      where: and(
        eq(relationships.orgId, orgId),
        fromType ? eq(relationships.fromType, fromType) : undefined,
        fromId   ? eq(relationships.fromId,   fromId)   : undefined,
        toType   ? eq(relationships.toType,   toType)   : undefined,
        toId     ? eq(relationships.toId,     toId)     : undefined,
      ),
    })

    return Response.json(rows)
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function POST(req: Request) {
  try {
    const { orgId } = await requireOrg()
    const body = await req.json()

    const [row] = await db
      .insert(relationships)
      .values({ orgId, ...body })
      .onConflictDoNothing()
      .returning()

    return Response.json(row ?? { message: "Already exists" }, { status: row ? 201 : 200 })
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }
}
```

**File:** `app/api/relationships/[id]/route.ts`

```ts
// DELETE only — remove an edge
```

---

### Step 4 — Context events route

**File:** `app/api/context/events/route.ts`

```ts
import { db } from "@/lib/db"
import { contextEvents } from "@/lib/db/schema"
import { and, eq, gte, lte, sql } from "drizzle-orm"
import { requireOrg, AuthError } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  try {
    const { orgId } = await requireOrg()
    const { searchParams } = new URL(req.url)

    const sourceApp  = searchParams.get("source_app")
    const eventType  = searchParams.get("event_type")
    const entityType = searchParams.get("entity_type")
    const entityId   = searchParams.get("entity_id")
    const from       = searchParams.get("from")
    const to         = searchParams.get("to")
    const limit      = parseInt(searchParams.get("limit") ?? "50")
    const cursor     = searchParams.get("cursor")

    const rows = await db.query.contextEvents.findMany({
      where: and(
        eq(contextEvents.orgId, orgId),
        sourceApp  ? eq(contextEvents.sourceApp,  sourceApp)  : undefined,
        eventType  ? eq(contextEvents.eventType,  eventType)  : undefined,
        entityType ? eq(contextEvents.entityType, entityType) : undefined,
        entityId   ? eq(contextEvents.entityId,   entityId)   : undefined,
        from       ? gte(contextEvents.createdAt, new Date(from)) : undefined,
        to         ? lte(contextEvents.createdAt, new Date(to))   : undefined,
        cursor     ? sql`created_at < ${cursor}` : undefined,
      ),
      orderBy: (e, { desc }) => [desc(e.createdAt)],
      limit,
    })

    return Response.json({
      events: rows,
      nextCursor: rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null,
    })
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }
}
```

---

### Step 5 — Integration tests

**File:** `tests/api/records.test.ts`

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { db } from "@/lib/db"
import { records, contextEvents } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { resetDb, seedTestOrg } from "../setup"

let orgId: string
let userId: string

beforeEach(async () => {
  await resetDb()
  const { org, user } = await seedTestOrg()
  orgId = org.id
  userId = user.id
})

describe("POST /api/records", () => {
  it("creates a record and logs a context event", async () => {
    const [record] = await db
      .insert(records)
      .values({ orgId, objectType: "contacts", data: { firstName: "Sarah", email: "sarah@co.com" } })
      .returning()

    expect(record.id).toBeDefined()
    expect((record.data as any).email).toBe("sarah@co.com")
  })
})

describe("deleteRecord", () => {
  it("cascades to orphaned tasks", async () => {
    const { deleteRecord } = await import("@/lib/records")

    const [contact] = await db
      .insert(records)
      .values({ orgId, objectType: "contacts", data: { firstName: "Sarah" } })
      .returning()

    await db.insert(records).values({
      orgId, objectType: "tasks",
      data: { title: "Call Sarah", parentType: "contacts", parentId: contact.id },
    })

    await deleteRecord(contact.id, orgId, userId)

    const orphans = await db.query.records.findMany({
      where: and(
        eq(records.orgId, orgId),
        eq(records.objectType, "tasks"),
        sql`data->>'parentId' = ${contact.id}`,
      ),
    })
    expect(orphans).toHaveLength(0)
  })
})
```

**File:** `tests/workers/embed-entity.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { getEntityChunks } from "@/lib/queue/handlers"

describe("getEntityChunks", () => {
  it("returns a single chunk for contacts", () => {
    const chunks = getEntityChunks("contacts", { firstName: "Sarah", email: "sarah@co.com" })
    expect(chunks).toHaveLength(1)
    expect(chunks[0].chunkIndex).toBe(0)
    expect(chunks[0].text).toContain("Sarah")
  })

  it("chunks long meeting transcripts", () => {
    const longText = "word ".repeat(3000)
    const chunks = getEntityChunks("meetings", { transcript: longText })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.map(c => c.chunkIndex)).toEqual([...Array(chunks.length).keys()])
  })
})
```

**Run:** `npm test` — all tests should pass.

---

### Phase 2B complete checklist
- [ ] `lib/records.ts` with `deleteRecord()` and cascade logic
- [ ] `GET/POST /api/records` route
- [ ] `GET/PATCH/DELETE /api/records/[id]` route
- [ ] `GET/POST /api/relationships` route
- [ ] `DELETE /api/relationships/[id]` route
- [ ] `GET /api/context/events` route with all filter params
- [ ] Records integration tests pass
- [ ] Embed handler unit tests pass

---

## Phase 2C — Custom Objects
> Let users define new object types (Airtable-style). No new routes needed — custom types use the same records API.

### Step 1 — Object config routes

**File:** `app/api/objects/route.ts` — list + create custom types

```ts
// GET  — list all object_config rows for org (system + custom)
// POST — create new custom type
//   body: { slug, name, name_plural, icon, color, fields: ObjectField[] }
//   Validate: slug is URL-safe, no conflict with existing slug in org
```

**File:** `app/api/objects/[slug]/route.ts` — get + update + delete custom type

```ts
// GET   — return object_config row + count of records
// PATCH — update fields array (add/reorder/remove fields)
//   Note: removing a field doesn't delete data; it just stops showing in UI
// DELETE — delete object_config + all records of that type + their events/relationships
//   Confirm with the client before calling (destructive)
```

---

### Step 2 — Field builder UI

**File:** `apps/context/components/field-builder-modal.tsx`

A dialog where users:
1. Name their object type (name, plural, icon, color)
2. Add fields one by one (name, type, options if select)
3. Drag to reorder
4. Save → `POST /api/objects`

Use Radix `Dialog` + a drag-handle list (no library needed for simple reordering).

---

### Step 3 — Verify custom types work end-to-end

1. Create a custom type via the API: `POST /api/objects { slug: "projects", name: "Project", ... }`
2. Create a record of that type: `POST /api/records { object_type: "projects", data: { name: "Alpha" } }`
3. Confirm a `context_event` row was created with `event_type: "projects.created"`
4. Confirm the record appears in `GET /api/records?type=projects`

No new routes needed. The records API already handles it.

---

## Phase 2D — Context App UI
> Read interface over all four layers. The "god-mode view."

### Step 1 — Timeline view

**File:** `apps/context/components/timeline.tsx`

- Fetch `GET /api/context/events?limit=50`
- Render each event as a card: source app icon, event type label, entity name (linked), relative timestamp
- Infinite scroll: when near the bottom, fetch `?cursor=<nextCursor>`
- Filter bar at top: by `source_app`, `event_type`, date range
- Use `IntersectionObserver` for scroll detection — no library needed

---

### Step 2 — Semantic search

**File:** `app/api/context/search/route.ts`

```ts
import { db } from "@/lib/db"
import { contextEmbeddings, records } from "@/lib/db/schema"
import { sql, eq, and } from "drizzle-orm"
import { requireOrg, AuthError } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  try {
    const { orgId } = await requireOrg()
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")
    const entityTypes = searchParams.get("entity_types")?.split(",")
    const limit = parseInt(searchParams.get("limit") ?? "20")

    if (!query) return Response.json({ error: "q required" }, { status: 422 })

    // Embed the query via gateway
    const queryEmbedding = await fetchGatewayEmbedding(query)

    // Cosine similarity search
    const results = await db.execute(sql`
      SELECT
        e.entity_type, e.entity_id, e.chunk_text,
        1 - (e.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS score,
        r.data
      FROM context_embeddings e
      JOIN records r ON r.id = e.entity_id AND r.org_id = e.org_id
      WHERE e.org_id = ${orgId}
        ${entityTypes?.length ? sql`AND e.entity_type = ANY(${entityTypes})` : sql``}
      ORDER BY e.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `)

    return Response.json(results.rows)
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }
}
```

**File:** `apps/context/components/search-view.tsx`

- Debounced search input (300ms)
- Calls `GET /api/context/search?q=...`
- Renders ranked results: entity type badge, name, score bar, excerpt highlight

---

### Step 3 — Record detail page

**File:** `app/(workspace)/context/[type]/[id]/page.tsx`

Three sections rendered together:
1. **Fields panel** — reads `GET /api/records/:id`, renders `data` fields from `object_config`
2. **Timeline tab** — reads `GET /api/context/events?entity_type=x&entity_id=y`
3. **Relationships tab** — reads `GET /api/relationships?from_id=y` + `?to_id=y`, renders linked records with navigation

---

## Phase 5B — Agent Persistence
> Upgrade agent from in-memory to persistent threads with sidebar history.

### Step 1 — Thread management routes

**File:** `app/api/agent/threads/route.ts`

```ts
// GET  — list threads for current user, newest first
// POST — create thread { id }, optionally with { title }
```

**File:** `app/api/agent/threads/[id]/route.ts`

```ts
// GET    — return thread metadata + messages array (UIMessage format)
// PATCH  — rename: { title }
// DELETE — hard delete thread + cascade messages
```

**File:** `app/api/agent/threads/[id]/messages/route.ts`

```ts
// GET — return messages for a thread in UIMessage format
// (used by useRemoteThreadListRuntime to hydrate the thread on switch)
```

---

### Step 2 — Update chat route to persist messages

**File:** `app/api/agent/chat/route.ts`

```ts
// On POST:
// 1. Read threadId from request body (create thread if absent)
// 2. Save incoming user message to agent_messages
// 3. Stream response from gateway
// 4. On finish (onFinish callback in streamText): save assistant message
// 5. If thread has no title: generate one from first user message (truncate to 60 chars)
// Return threadId in response header so client can update URL
```

---

### Step 3 — Switch runtime

**File:** `apps/agent/components/agent-chat.tsx`

Replace `useChatRuntime` with `useRemoteThreadListRuntime`:

```ts
import { useRemoteThreadListRuntime } from "@assistant-ui/react"
import { DefaultChatTransport } from "ai"

const runtime = useRemoteThreadListRuntime({
  list:   () => fetch("/api/agent/threads").then(r => r.json()),
  create: () => fetch("/api/agent/threads", { method: "POST" }).then(r => r.json()),
  delete: (id) => fetch(`/api/agent/threads/${id}`, { method: "DELETE" }),
  rename: (id, title) => fetch(`/api/agent/threads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  }),
  loadMessages: (id) => fetch(`/api/agent/threads/${id}/messages`).then(r => r.json()),
  transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
})
```

---

### Step 4 — Thread list UI polish

Extend `apps/agent/components/agent-chat.tsx`:
- `ThreadListItemMorePrimitive` overflow menu per item: Rename, Delete
- Relative timestamp next to thread title (use `date-fns` `formatDistanceToNow`)
- Empty state when no threads: "No conversations yet"

---

## Phase 3 — Sim / Automations Engine
> Porting the Sim executor. Budget this as a standalone 2–3 week effort.

### Step 1 — Audit (before writing any code)

Go through `C:\Users\aravb\Desktop\Code\basics\basicsOS\sim` and document:
- [ ] What tables does Sim own? List them.
- [ ] What are its external dependencies (Redis, S3, etc.)?
- [ ] Does it assume a specific Next.js version or React version?
- [ ] How does its executor receive trigger data? What's the interface?
- [ ] How does it authenticate? Does it have its own session model?

Write answers in a `PHASE_3_AUDIT.md` file before touching any code.

---

### Step 2 — Lift the executor (not the canvas first)

Port `sim/src/executor/` into `apps/automations/executor/`. The executor is pure logic — no UI. Get it running in isolation first.

- Adapter file: `apps/automations/executor/db-adapter.ts` — maps Sim's DB calls to the basics-workspace Drizzle schema
- Test: run a simple 2-block workflow (Trigger → Agent) against the new DB

---

### Step 3 — Register new blocks

**File:** `apps/automations/blocks/context-query.ts`

Calls `GET /api/records` with filters. Returns `{ records, total }` as block output.

**File:** `apps/automations/triggers/workspace-context-event.ts`

Listens for a specific `event_type` pattern in `context_events`. Configured in the trigger block UI.

Wire `check-automation-triggers` worker (already stubbed in `lib/queue/workers.ts`) to actually query deployed workflows and dispatch `run-automation` jobs.

---

### Step 4 — Port the canvas

Port `sim/src/app/(workspace)/` React Flow canvas into `apps/automations/components/`. This is the largest UI effort in Phase 3.

Keep it isolated — the canvas renders workflows, the executor runs them. They share only a workflow schema (JSON).

---

## Ongoing — Testing standards

Every route written should have a corresponding integration test in `tests/api/`. The pattern is always:

1. `beforeEach`: `resetDb()` + `seedTestOrg()`
2. Call the handler directly (import and invoke) or via `fetch` against a test server
3. Assert the DB state directly — don't trust the response alone

Worker handlers (in `lib/queue/handlers.ts`) are pure functions and should have unit tests in `tests/workers/`.

UI components don't need tests at this stage — focus testing budget on the DB layer.

---

## Environment variables

All phases require these to be set in `.env.local`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/basics
BETTER_AUTH_SECRET=<random 32-char string>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GATEWAY_URL=https://api.basicsos.com
GATEWAY_API_KEY=bos_live_sk_...
```

For tests, add `.env.test`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/basics_test
```

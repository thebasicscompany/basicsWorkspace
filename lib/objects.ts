import { db } from "./db"
import { objectConfig, records } from "./db/schema"
import { eq, and, sql } from "drizzle-orm"
import type { ObjectField } from "./db/schema"

// System object configurations seeded on org creation
export const SYSTEM_OBJECTS: Array<{
  slug: string
  name: string
  namePlural: string
  icon: string
  color: string
  fields: ObjectField[]
  position: number
}> = [
  {
    slug: "contacts",
    name: "Contact",
    namePlural: "Contacts",
    icon: "UserCircle",
    color: "text-blue-500",
    position: 0,
    fields: [
      { id: "firstName", name: "First Name", key: "firstName", type: "text", required: true, position: 0 },
      { id: "lastName", name: "Last Name", key: "lastName", type: "text", required: false, position: 1 },
      { id: "email", name: "Email", key: "email", type: "email", required: false, position: 2 },
      { id: "phone", name: "Phone", key: "phone", type: "phone", required: false, position: 3 },
      { id: "companyId", name: "Company", key: "companyId", type: "relation", required: false, relationTo: "companies", position: 4 },
    ],
  },
  {
    slug: "companies",
    name: "Company",
    namePlural: "Companies",
    icon: "Buildings",
    color: "text-violet-500",
    position: 1,
    fields: [
      { id: "name", name: "Name", key: "name", type: "text", required: true, position: 0 },
      { id: "domain", name: "Domain", key: "domain", type: "url", required: false, position: 1 },
      { id: "industry", name: "Industry", key: "industry", type: "text", required: false, position: 2 },
      { id: "size", name: "Size", key: "size", type: "text", required: false, position: 3 },
    ],
  },
  {
    slug: "deals",
    name: "Deal",
    namePlural: "Deals",
    icon: "CurrencyDollar",
    color: "text-green-500",
    position: 2,
    fields: [
      { id: "name", name: "Name", key: "name", type: "text", required: true, position: 0 },
      { id: "status", name: "Status", key: "status", type: "select", required: false, position: 1, options: [
        { id: "open", label: "Open", color: "blue" },
        { id: "closed_won", label: "Closed Won", color: "green" },
        { id: "closed_lost", label: "Closed Lost", color: "red" },
      ]},
      { id: "amount", name: "Amount", key: "amount", type: "number", required: false, position: 2 },
      { id: "companyId", name: "Company", key: "companyId", type: "relation", required: false, relationTo: "companies", position: 3 },
      { id: "ownerId", name: "Owner", key: "ownerId", type: "text", required: false, position: 4 },
      { id: "closedAt", name: "Closed At", key: "closedAt", type: "date", required: false, position: 5 },
    ],
  },
  {
    slug: "tasks",
    name: "Task",
    namePlural: "Tasks",
    icon: "CheckSquare",
    color: "text-orange-500",
    position: 3,
    fields: [
      { id: "title", name: "Title", key: "title", type: "text", required: true, position: 0 },
      { id: "status", name: "Status", key: "status", type: "select", required: false, position: 1, options: [
        { id: "todo", label: "To Do", color: "gray" },
        { id: "in_progress", label: "In Progress", color: "blue" },
        { id: "done", label: "Done", color: "green" },
      ]},
      { id: "dueAt", name: "Due Date", key: "dueAt", type: "date", required: false, position: 2 },
      { id: "assigneeId", name: "Assignee", key: "assigneeId", type: "text", required: false, position: 3 },
      { id: "parentType", name: "Parent Type", key: "parentType", type: "text", required: false, position: 4 },
      { id: "parentId", name: "Parent ID", key: "parentId", type: "text", required: false, position: 5 },
    ],
  },
  {
    slug: "notes",
    name: "Note",
    namePlural: "Notes",
    icon: "Note",
    color: "text-yellow-500",
    position: 4,
    fields: [
      { id: "body", name: "Body", key: "body", type: "text", required: true, position: 0 },
      { id: "authorId", name: "Author", key: "authorId", type: "text", required: false, position: 1 },
      { id: "parentType", name: "Parent Type", key: "parentType", type: "text", required: false, position: 2 },
      { id: "parentId", name: "Parent ID", key: "parentId", type: "text", required: false, position: 3 },
    ],
  },
  {
    slug: "meetings",
    name: "Meeting",
    namePlural: "Meetings",
    icon: "VideoCamera",
    color: "text-red-500",
    position: 5,
    fields: [
      { id: "title", name: "Title", key: "title", type: "text", required: true, position: 0 },
      { id: "transcript", name: "Transcript", key: "transcript", type: "text", required: false, position: 1 },
      { id: "summary", name: "Summary", key: "summary", type: "text", required: false, position: 2 },
      { id: "recordingUrl", name: "Recording URL", key: "recordingUrl", type: "url", required: false, position: 3 },
      { id: "startedAt", name: "Started At", key: "startedAt", type: "date", required: false, position: 4 },
      { id: "endedAt", name: "Ended At", key: "endedAt", type: "date", required: false, position: 5 },
    ],
  },
]

/** Derive a human-readable entity name from its type and data for use in context events. */
export function getEntityName(objectType: string, data: Record<string, unknown>): string {
  switch (objectType) {
    case "contacts":
      return [data.firstName, data.lastName].filter(Boolean).join(" ") || "Contact"
    case "tasks":
      return String(data.title ?? "Task")
    case "notes":
      return String(data.body ?? "Note").substring(0, 60)
    default:
      return String(data.name ?? data.title ?? objectType)
  }
}

/** Seed system object_config rows for a new org. Safe to call multiple times — skips existing. */
export async function seedSystemObjects(orgId: string) {
  for (const obj of SYSTEM_OBJECTS) {
    await db
      .insert(objectConfig)
      .values({
        orgId,
        slug: obj.slug,
        name: obj.name,
        namePlural: obj.namePlural,
        icon: obj.icon,
        color: obj.color,
        fields: obj.fields,
        isSystem: true,
        position: obj.position,
      })
      .onConflictDoNothing()
  }
}

/** Delete a record and cascade-delete orphaned tasks and notes that reference it. */
export async function deleteRecord(
  orgId: string,
  objectType: string,
  id: string
) {
  // Cascade-delete tasks and notes whose parentType/parentId point to this record
  // Uses raw SQL for JSONB field comparison: data->>'parentId' = id
  await db.execute(
    sql`DELETE FROM records WHERE org_id = ${orgId} AND object_type IN ('tasks','notes') AND data->>'parentType' = ${objectType} AND data->>'parentId' = ${id}`
  )
  // Delete the record itself
  await db
    .delete(records)
    .where(
      and(
        eq(records.orgId, orgId),
        eq(records.id, id as `${string}-${string}-${string}-${string}-${string}`)
      )
    )
}

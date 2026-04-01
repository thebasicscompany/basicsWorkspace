/**
 * Generic record tools — work with any object type (contacts, deals, tasks, notes, etc.)
 * Uses the records + objectConfig tables, so these tools automatically support
 * any app the user creates.
 */
import { z } from "zod"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { records, objectConfig } from "@/lib/db/schema"
import { logContextEvent } from "@/lib/context"
import { getEntityName } from "@/lib/objects"
import type { WorkspaceTool, ToolContext } from "../types"

export const listObjectTypes: WorkspaceTool = {
  id: "list_object_types",
  name: "List Object Types",
  description:
    "List all available object types in the workspace (e.g. contacts, deals, tasks, notes). Call this first to discover what data the user has.",
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const types = await db
      .select({
        slug: objectConfig.slug,
        name: objectConfig.name,
        namePlural: objectConfig.namePlural,
        fields: objectConfig.fields,
        isSystem: objectConfig.isSystem,
      })
      .from(objectConfig)
      .where(eq(objectConfig.orgId, ctx.orgId))
      .orderBy(objectConfig.position)

    return {
      objectTypes: types.map((t) => ({
        slug: t.slug,
        name: t.name,
        namePlural: t.namePlural,
        fieldCount: (t.fields as unknown[])?.length ?? 0,
        fields: (t.fields as Array<{ key: string; name: string; type: string }>).map((f) => ({
          key: f.key,
          name: f.name,
          type: f.type,
        })),
        isSystem: t.isSystem,
      })),
      count: types.length,
    }
  },
}

export const searchRecords: WorkspaceTool = {
  id: "search_records",
  name: "Search Records",
  description:
    "Search records of a given object type (contacts, deals, tasks, notes, etc.). Supports text search across all fields and field-specific filters.",
  parameters: z.object({
    objectType: z
      .string()
      .describe("Object type slug (e.g. 'contacts', 'deals', 'tasks', 'notes')"),
    query: z.string().optional().describe("Free-text search across all fields"),
    filters: z
      .record(z.string(), z.string())
      .optional()
      .describe("Field-specific filters as { fieldKey: value } pairs"),
    limit: z.number().optional().describe("Max results (default 20, max 100)"),
  }),
  execute: async ({ objectType, query, filters, limit: rawLimit }, ctx) => {
    const limit = Math.min(rawLimit ?? 20, 100)
    const conditions = [eq(records.orgId, ctx.orgId), eq(records.objectType, objectType)]

    if (query) {
      conditions.push(sql`${records.data}::text ILIKE ${"%" + query + "%"}`)
    }

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          conditions.push(sql`${records.data}->>${key} = ${value}`)
        }
      }
    }

    const rows = await db
      .select()
      .from(records)
      .where(and(...conditions))
      .orderBy(desc(records.createdAt))
      .limit(limit)

    return {
      records: rows.map((r) => ({
        id: r.id,
        objectType: r.objectType,
        data: r.data,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      count: rows.length,
      objectType,
    }
  },
}

export const getRecord: WorkspaceTool = {
  id: "get_record",
  name: "Get Record",
  description: "Get a single record by ID.",
  parameters: z.object({
    id: z.string().describe("Record UUID"),
  }),
  execute: async ({ id }, ctx) => {
    const [record] = await db
      .select()
      .from(records)
      .where(and(eq(records.id, id as any), eq(records.orgId, ctx.orgId)))
      .limit(1)

    if (!record) return { error: "Record not found" }
    return { record }
  },
}

export const createRecord: WorkspaceTool = {
  id: "create_record",
  name: "Create Record",
  description:
    "Create a new record of any object type. Use list_object_types first to see available fields.",
  parameters: z.object({
    objectType: z
      .string()
      .describe("Object type slug (e.g. 'contacts', 'deals', 'tasks')"),
    data: z
      .record(z.string(), z.unknown())
      .describe("Record data as { fieldKey: value } pairs"),
  }),
  execute: async ({ objectType, data }, ctx) => {
    const [record] = await db
      .insert(records)
      .values({
        orgId: ctx.orgId,
        objectType,
        data,
      })
      .returning()

    await logContextEvent({
      orgId: ctx.orgId,
      userId: ctx.userId,
      sourceApp: objectType,
      eventType: `${objectType}.created`,
      entityType: objectType,
      entityId: record.id,
      entityName: getEntityName(objectType, data),
    })

    return { record, message: `Created ${objectType} record` }
  },
}

export const updateRecord: WorkspaceTool = {
  id: "update_record",
  name: "Update Record",
  description: "Update fields on an existing record. Only specified fields are changed.",
  parameters: z.object({
    id: z.string().describe("Record UUID"),
    data: z
      .record(z.string(), z.unknown())
      .describe("Fields to update as { fieldKey: value } pairs"),
  }),
  execute: async ({ id, data }, ctx) => {
    const [existing] = await db
      .select()
      .from(records)
      .where(and(eq(records.id, id as any), eq(records.orgId, ctx.orgId)))
      .limit(1)

    if (!existing) return { error: "Record not found" }

    const merged = { ...(existing.data as Record<string, unknown>), ...data }

    await db
      .update(records)
      .set({ data: merged, updatedAt: new Date() })
      .where(eq(records.id, id as any))

    await logContextEvent({
      orgId: ctx.orgId,
      userId: ctx.userId,
      sourceApp: existing.objectType,
      eventType: `${existing.objectType}.updated`,
      entityType: existing.objectType,
      entityId: existing.id,
      entityName: getEntityName(existing.objectType, merged),
    })

    return { record: { ...existing, data: merged }, message: "Record updated" }
  },
}

export const deleteRecord: WorkspaceTool = {
  id: "delete_record",
  name: "Delete Record",
  description: "Permanently delete a record by ID.",
  parameters: z.object({
    id: z.string().describe("Record UUID"),
  }),
  execute: async ({ id }, ctx) => {
    const [existing] = await db
      .select()
      .from(records)
      .where(and(eq(records.id, id as any), eq(records.orgId, ctx.orgId)))
      .limit(1)

    if (!existing) return { error: "Record not found" }

    await db.delete(records).where(eq(records.id, id as any))

    await logContextEvent({
      orgId: ctx.orgId,
      userId: ctx.userId,
      sourceApp: existing.objectType,
      eventType: `${existing.objectType}.deleted`,
      entityType: existing.objectType,
      entityId: existing.id,
      entityName: getEntityName(existing.objectType, existing.data as Record<string, unknown>),
    })

    return { message: `Deleted ${existing.objectType} record` }
  },
}

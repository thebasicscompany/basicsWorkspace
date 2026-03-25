import { and, desc, eq, gte, inArray, lt, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { contextEvents } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { searchParams } = new URL(req.url)

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)
  const cursor = searchParams.get("cursor") // ISO timestamp
  const sourceApps = searchParams.get("source_app")?.split(",").filter(Boolean)
  const eventTypes = searchParams.get("event_type")?.split(",").filter(Boolean)
  const entityType = searchParams.get("entity_type")
  const entityId = searchParams.get("entity_id")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const conditions = [eq(contextEvents.orgId, orgId)]

  if (cursor) {
    conditions.push(lt(contextEvents.createdAt, new Date(cursor)))
  }
  if (from) {
    conditions.push(gte(contextEvents.createdAt, new Date(from)))
  }
  if (to) {
    conditions.push(lte(contextEvents.createdAt, new Date(to)))
  }
  if (entityType) {
    conditions.push(eq(contextEvents.entityType, entityType))
  }
  if (entityId) {
    conditions.push(
      eq(contextEvents.entityId, entityId as `${string}-${string}-${string}-${string}-${string}`)
    )
  }

  if (sourceApps?.length) {
    conditions.push(inArray(contextEvents.sourceApp, sourceApps))
  }
  if (eventTypes?.length) {
    conditions.push(inArray(contextEvents.eventType, eventTypes))
  }

  const rows = await db
    .select()
    .from(contextEvents)
    .where(and(...conditions))
    .orderBy(desc(contextEvents.createdAt))
    .limit(limit)

  const nextCursor =
    rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null

  return Response.json({ events: rows, nextCursor })
}

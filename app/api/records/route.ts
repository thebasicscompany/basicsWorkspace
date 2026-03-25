import { and, desc, eq, lt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { records } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"
import { logContextEvent } from "@/lib/context"
import { getEntityName } from "@/lib/objects"

// Only allow safe alphanumeric JSONB key names to prevent injection
function isSafeKey(key: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
}

export async function GET(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { searchParams } = new URL(req.url)

  const type = searchParams.get("type")
  if (!type) return Response.json({ error: "type is required" }, { status: 400 })

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)
  const cursor = searchParams.get("cursor") // ISO timestamp of last record
  const search = searchParams.get("search")

  const conditions = [eq(records.orgId, orgId), eq(records.objectType, type)]

  if (cursor) {
    conditions.push(lt(records.createdAt, new Date(cursor)))
  }

  if (search) {
    conditions.push(sql`${records.data}::text ILIKE ${"%" + search + "%"}`)
  }

  // Parse filter[field]=value query params
  for (const [key, value] of searchParams.entries()) {
    const match = key.match(/^filter\[(.+)\]$/)
    if (match && isSafeKey(match[1])) {
      conditions.push(sql`${records.data}->>${match[1]} = ${value}`)
    }
  }

  const rows = await db
    .select()
    .from(records)
    .where(and(...conditions))
    .orderBy(desc(records.createdAt))
    .limit(limit)

  const nextCursor =
    rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null

  return Response.json({ records: rows, nextCursor })
}

export async function POST(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const body = await req.json()
  const { object_type, data } = body as { object_type: string; data: Record<string, unknown> }

  if (!object_type || !data) {
    return Response.json({ error: "object_type and data are required" }, { status: 400 })
  }

  const [record] = await db
    .insert(records)
    .values({ orgId, objectType: object_type, data })
    .returning()

  await logContextEvent({
    orgId,
    userId,
    sourceApp: object_type,
    eventType: `${object_type}.created`,
    entityType: object_type,
    entityId: record.id,
    entityName: getEntityName(object_type, data),
  })

  return Response.json(record, { status: 201 })
}

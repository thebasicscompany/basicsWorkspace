import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { records, relationships } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"
import { logContextEvent } from "@/lib/context"
import { getEntityName, deleteRecord } from "@/lib/objects"

type Params = Promise<{ id: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id } = await params

  const [record] = await db
    .select()
    .from(records)
    .where(
      and(
        eq(records.id, id as `${string}-${string}-${string}-${string}-${string}`),
        eq(records.orgId, orgId)
      )
    )
    .limit(1)

  if (!record) return Response.json({ error: "Not found" }, { status: 404 })

  const rels = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.orgId, orgId),
        eq(relationships.fromId, id as `${string}-${string}-${string}-${string}-${string}`)
      )
    )

  return Response.json({ record, relationships: rels })
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { id } = await params
  const updates = (await req.json()) as Record<string, unknown>

  // Merge updates into existing JSONB — right-hand side wins on key conflicts
  const [result] = await db
    .update(records)
    .set({
      data: sql`${records.data} || ${JSON.stringify(updates)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(records.id, id as `${string}-${string}-${string}-${string}-${string}`),
        eq(records.orgId, orgId)
      )
    )
    .returning()

  if (!result) return Response.json({ error: "Not found" }, { status: 404 })

  await logContextEvent({
    orgId,
    userId,
    sourceApp: result.objectType,
    eventType: `${result.objectType}.updated`,
    entityType: result.objectType,
    entityId: result.id,
    entityName: getEntityName(result.objectType, result.data as Record<string, unknown>),
    metadata: { updates },
  })

  return Response.json(result)
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { id } = await params

  const [record] = await db
    .select()
    .from(records)
    .where(
      and(
        eq(records.id, id as `${string}-${string}-${string}-${string}-${string}`),
        eq(records.orgId, orgId)
      )
    )
    .limit(1)

  if (!record) return Response.json({ error: "Not found" }, { status: 404 })

  await deleteRecord(orgId, record.objectType, id)

  await logContextEvent({
    orgId,
    userId,
    sourceApp: record.objectType,
    eventType: `${record.objectType}.deleted`,
    entityType: record.objectType,
    entityId: id,
    entityName: getEntityName(record.objectType, record.data as Record<string, unknown>),
  })

  return new Response(null, { status: 204 })
}

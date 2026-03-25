import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { objectConfig, records } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"
import { logContextEvent } from "@/lib/context"
import type { ObjectField } from "@/lib/db/schema"

type Params = Promise<{ slug: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { slug } = await params

  const [obj] = await db
    .select()
    .from(objectConfig)
    .where(and(eq(objectConfig.orgId, orgId), eq(objectConfig.slug, slug)))
    .limit(1)

  if (!obj) return Response.json({ error: "Not found" }, { status: 404 })

  return Response.json(obj)
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { slug } = await params

  const body = await req.json() as {
    name?: string
    namePlural?: string
    icon?: string
    color?: string
    fields?: ObjectField[]
    position?: number
  }

  const updateValues: Partial<typeof objectConfig.$inferInsert> = {}
  if (body.name !== undefined) updateValues.name = body.name
  if (body.namePlural !== undefined) updateValues.namePlural = body.namePlural
  if (body.icon !== undefined) updateValues.icon = body.icon
  if (body.color !== undefined) updateValues.color = body.color
  if (body.fields !== undefined) updateValues.fields = body.fields
  if (body.position !== undefined) updateValues.position = body.position

  const [obj] = await db
    .update(objectConfig)
    .set(updateValues)
    .where(and(eq(objectConfig.orgId, orgId), eq(objectConfig.slug, slug)))
    .returning()

  if (!obj) return Response.json({ error: "Not found" }, { status: 404 })

  await logContextEvent({
    orgId,
    userId,
    sourceApp: "context",
    eventType: "object.updated",
    entityType: "object_config",
    entityId: obj.id,
    entityName: obj.name,
  })

  return Response.json(obj)
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { slug } = await params

  const [obj] = await db
    .select()
    .from(objectConfig)
    .where(and(eq(objectConfig.orgId, orgId), eq(objectConfig.slug, slug)))
    .limit(1)

  if (!obj) return Response.json({ error: "Not found" }, { status: 404 })

  if (obj.isSystem) {
    return Response.json({ error: "System objects cannot be deleted" }, { status: 403 })
  }

  // Delete all records of this type
  await db
    .delete(records)
    .where(and(eq(records.orgId, orgId), eq(records.objectType, slug)))

  // Delete the object config
  await db
    .delete(objectConfig)
    .where(and(eq(objectConfig.orgId, orgId), eq(objectConfig.slug, slug)))

  await logContextEvent({
    orgId,
    userId,
    sourceApp: "context",
    eventType: "object.deleted",
    entityType: "object_config",
    entityId: obj.id,
    entityName: obj.name,
  })

  return new Response(null, { status: 204 })
}

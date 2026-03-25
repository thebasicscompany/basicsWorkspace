import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { relationships } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"

export async function GET(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { searchParams } = new URL(req.url)

  const fromType = searchParams.get("from_type")
  const fromId = searchParams.get("from_id")
  const toType = searchParams.get("to_type")
  const toId = searchParams.get("to_id")

  if (!((fromType && fromId) || (toType && toId))) {
    return Response.json(
      { error: "Provide either from_type+from_id or to_type+to_id" },
      { status: 400 }
    )
  }

  const conditions = [eq(relationships.orgId, orgId)]

  if (fromType && fromId) {
    conditions.push(eq(relationships.fromType, fromType))
    conditions.push(
      eq(relationships.fromId, fromId as `${string}-${string}-${string}-${string}-${string}`)
    )
  }

  if (toType && toId) {
    conditions.push(eq(relationships.toType, toType))
    conditions.push(
      eq(relationships.toId, toId as `${string}-${string}-${string}-${string}-${string}`)
    )
  }

  const rows = await db
    .select()
    .from(relationships)
    .where(and(...conditions))

  return Response.json({ relationships: rows })
}

export async function POST(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const body = await req.json() as {
    from_type: string
    from_id: string
    to_type: string
    to_id: string
    relation_type: string
    metadata?: Record<string, unknown>
  }

  const { from_type, from_id, to_type, to_id, relation_type, metadata } = body

  if (!from_type || !from_id || !to_type || !to_id || !relation_type) {
    return Response.json(
      { error: "from_type, from_id, to_type, to_id, and relation_type are required" },
      { status: 400 }
    )
  }

  const [rel] = await db
    .insert(relationships)
    .values({
      orgId,
      fromType: from_type,
      fromId: from_id as `${string}-${string}-${string}-${string}-${string}`,
      toType: to_type,
      toId: to_id as `${string}-${string}-${string}-${string}-${string}`,
      relationType: relation_type,
      metadata,
    })
    .onConflictDoNothing()
    .returning()

  if (!rel) {
    // Conflict — relationship already exists
    const [existing] = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.orgId, orgId),
          eq(relationships.fromType, from_type),
          eq(relationships.fromId, from_id as `${string}-${string}-${string}-${string}-${string}`),
          eq(relationships.toType, to_type),
          eq(relationships.toId, to_id as `${string}-${string}-${string}-${string}-${string}`),
          eq(relationships.relationType, relation_type)
        )
      )
      .limit(1)
    return Response.json(existing, { status: 200 })
  }

  return Response.json(rel, { status: 201 })
}

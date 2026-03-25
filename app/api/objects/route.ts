import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { objectConfig } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"
import { logContextEvent } from "@/lib/context"
import type { ObjectField } from "@/lib/db/schema"

export async function GET(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx

  const objects = await db
    .select()
    .from(objectConfig)
    .where(eq(objectConfig.orgId, orgId))
    .orderBy(objectConfig.position)

  return Response.json({ objects })
}

export async function POST(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx

  const body = await req.json() as {
    slug: string
    name: string
    namePlural: string
    icon: string
    color: string
    fields?: ObjectField[]
  }

  const { slug, name, namePlural, icon, color, fields = [] } = body

  if (!slug || !name || !namePlural || !icon || !color) {
    return Response.json(
      { error: "slug, name, namePlural, icon, and color are required" },
      { status: 400 }
    )
  }

  if (!/^[a-z][a-z0-9_]*$/.test(slug)) {
    return Response.json(
      { error: "slug must be lowercase alphanumeric with underscores, starting with a letter" },
      { status: 400 }
    )
  }

  // Get next position
  const existing = await db
    .select({ position: objectConfig.position })
    .from(objectConfig)
    .where(eq(objectConfig.orgId, orgId))
    .orderBy(objectConfig.position)

  const nextPosition = existing.length > 0
    ? Math.max(...existing.map((r) => r.position)) + 1
    : 0

  const [obj] = await db
    .insert(objectConfig)
    .values({ orgId, slug, name, namePlural, icon, color, fields, isSystem: false, position: nextPosition })
    .returning()

  await logContextEvent({
    orgId,
    userId,
    sourceApp: "context",
    eventType: "object.created",
    entityType: "object_config",
    entityId: obj.id,
    entityName: name,
  })

  return Response.json(obj, { status: 201 })
}

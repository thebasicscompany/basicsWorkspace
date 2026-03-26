import { and, desc, eq, isNull, lt } from "drizzle-orm"
import { db } from "@/lib/db"
import { workflows } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"
import { logContextEvent } from "@/lib/context"

export async function GET(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { searchParams } = new URL(req.url)

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)
  const cursor = searchParams.get("cursor")

  const conditions = [eq(workflows.orgId, orgId), isNull(workflows.archivedAt)]

  if (cursor) {
    conditions.push(lt(workflows.createdAt, new Date(cursor)))
  }

  const rows = await db
    .select()
    .from(workflows)
    .where(and(...conditions))
    .orderBy(desc(workflows.createdAt))
    .limit(limit)

  const nextCursor =
    rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null

  return Response.json({ workflows: rows, nextCursor })
}

export async function POST(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const body = await req.json()
  const { name, description } = body as { name?: string; description?: string }

  const [workflow] = await db
    .insert(workflows)
    .values({ orgId, userId, name: name ?? "Untitled Workflow", description })
    .returning()

  await logContextEvent({
    orgId,
    userId,
    sourceApp: "automations",
    eventType: "workflow.created",
    entityType: "workflow",
    entityId: workflow.id,
    entityName: workflow.name,
  })

  return Response.json(workflow, { status: 201 })
}

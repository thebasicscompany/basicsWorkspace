import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workflows } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"
import { logContextEvent } from "@/lib/context"

type Params = Promise<{ id: string }>

/**
 * GET /api/workflows/[id]/variables — returns the workflow's variables JSON.
 */
export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id } = await params

  const [workflow] = await db
    .select({ variables: workflows.variables })
    .from(workflows)
    .where(and(eq(workflows.id, id as any), eq(workflows.orgId, orgId)))
    .limit(1)

  if (!workflow) return Response.json({ error: "Not found" }, { status: 404 })

  return Response.json({ data: workflow.variables ?? {} })
}

/**
 * POST /api/workflows/[id]/variables — replaces the workflow's variables JSON.
 * Body: { variables: Record<string, Variable> }
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { id } = await params
  const body = await req.json() as { variables: Record<string, unknown> }

  if (!body.variables || typeof body.variables !== 'object') {
    return Response.json({ error: "variables must be an object" }, { status: 400 })
  }

  const [existing] = await db
    .select({ id: workflows.id })
    .from(workflows)
    .where(and(eq(workflows.id, id as any), eq(workflows.orgId, orgId)))
    .limit(1)

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

  await db
    .update(workflows)
    .set({ variables: body.variables })
    .where(eq(workflows.id, id as any))

  await logContextEvent({
    eventType: "workflow.variables.updated",
    sourceApp: "automations",
    entityType: "workflow",
    entityId: id,
    userId,
    orgId,
    metadata: { variableCount: Object.keys(body.variables).length },
  })

  return Response.json({ data: body.variables })
}

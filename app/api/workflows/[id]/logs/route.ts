import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workflows, workflowExecutionLogs } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"

type Params = Promise<{ id: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id } = await params

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id as `${string}-${string}-${string}-${string}-${string}`), eq(workflows.orgId, orgId)))
    .limit(1)

  if (!workflow) return Response.json({ error: "Not found" }, { status: 404 })

  // Stub — Phase 3D will populate real execution logs
  const logs = await db
    .select()
    .from(workflowExecutionLogs)
    .where(eq(workflowExecutionLogs.workflowId, id as `${string}-${string}-${string}-${string}-${string}`))
    .orderBy(desc(workflowExecutionLogs.startedAt))
    .limit(50)

  return Response.json({ logs })
}

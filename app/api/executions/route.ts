import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { workflows, workflowExecutionLogs } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"

/**
 * GET /api/executions — list execution logs across all workflows for the org.
 *
 * Query params:
 *   status  — filter by status (running | success | error | cancelled)
 *   limit   — max rows (default 50, max 200)
 *   offset  — pagination offset (default 0)
 */
export async function GET(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get("status")
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200)
  const offset = Number(url.searchParams.get("offset")) || 0

  const conditions = [eq(workflowExecutionLogs.orgId, orgId)]
  if (statusFilter) {
    conditions.push(eq(workflowExecutionLogs.status, statusFilter))
  }

  const [logs, countResult] = await Promise.all([
    db
      .select({
        id: workflowExecutionLogs.id,
        workflowId: workflowExecutionLogs.workflowId,
        workflowName: workflows.name,
        executionId: workflowExecutionLogs.executionId,
        status: workflowExecutionLogs.status,
        trigger: workflowExecutionLogs.trigger,
        startedAt: workflowExecutionLogs.startedAt,
        endedAt: workflowExecutionLogs.endedAt,
        totalDurationMs: workflowExecutionLogs.totalDurationMs,
        executionData: workflowExecutionLogs.executionData,
        cost: workflowExecutionLogs.cost,
      })
      .from(workflowExecutionLogs)
      .leftJoin(workflows, eq(workflowExecutionLogs.workflowId, workflows.id))
      .where(and(...conditions))
      .orderBy(desc(workflowExecutionLogs.startedAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(workflowExecutionLogs)
      .where(and(...conditions)),
  ])

  return Response.json({
    logs,
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  })
}

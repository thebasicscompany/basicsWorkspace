/**
 * Workflow tools — list, run, and check status of automations.
 */
import { z } from "zod"
import { and, desc, eq, isNull, ilike } from "drizzle-orm"
import { db } from "@/lib/db"
import { workflows, workflowExecutionLogs } from "@/lib/db/schema"
import type { WorkspaceTool } from "../types"

export const listWorkflows: WorkspaceTool = {
  id: "list_workflows",
  name: "List Workflows",
  description: "List automation workflows in the workspace. Optionally filter by name.",
  parameters: z.object({
    query: z.string().optional().describe("Optional search by workflow name"),
  }),
  execute: async ({ query }, ctx) => {
    const conditions = [eq(workflows.orgId, ctx.orgId), isNull(workflows.archivedAt)]
    if (query) conditions.push(ilike(workflows.name, `%${query}%`))

    const results = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        description: workflows.description,
        isDeployed: workflows.isDeployed,
        runCount: workflows.runCount,
        lastRunAt: workflows.lastRunAt,
      })
      .from(workflows)
      .where(and(...conditions))
      .orderBy(desc(workflows.updatedAt))
      .limit(20)

    return { workflows: results, count: results.length }
  },
}

export const getWorkflowLogs: WorkspaceTool = {
  id: "get_workflow_logs",
  name: "Get Workflow Logs",
  description:
    "Get recent execution logs for a workflow. Shows status, trigger type, duration, and timestamps.",
  parameters: z.object({
    workflowId: z.string().describe("Workflow UUID"),
    limit: z.number().optional().describe("Max results (default 10)"),
  }),
  execute: async ({ workflowId, limit: rawLimit }, ctx) => {
    const limit = Math.min(rawLimit ?? 10, 50)

    const logs = await db
      .select({
        id: workflowExecutionLogs.id,
        executionId: workflowExecutionLogs.executionId,
        status: workflowExecutionLogs.status,
        trigger: workflowExecutionLogs.trigger,
        startedAt: workflowExecutionLogs.startedAt,
        endedAt: workflowExecutionLogs.endedAt,
        totalDurationMs: workflowExecutionLogs.totalDurationMs,
      })
      .from(workflowExecutionLogs)
      .where(
        and(
          eq(workflowExecutionLogs.workflowId, workflowId as any),
          eq(workflowExecutionLogs.orgId, ctx.orgId)
        )
      )
      .orderBy(desc(workflowExecutionLogs.startedAt))
      .limit(limit)

    return { logs, count: logs.length }
  },
}

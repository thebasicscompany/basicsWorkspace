/**
 * Cancel an in-flight workflow execution.
 * Adapted from Sim's app/api/workflows/[id]/executions/[executionId]/cancel/route.ts
 *
 * Sim uses Redis + local abort. We use in-process cancellation only.
 */
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workflows, workflowExecutionLogs } from '@/lib/db/schema'
import { requireOrg } from '@/lib/auth-helpers'
import { cancelExecution } from '@/lib/execution/cancellation'
import { createLogger } from '@/lib/sim/logger'

const logger = createLogger('CancelExecutionAPI')

type Params = Promise<{ id: string; executionId: string }>

export async function POST(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id: workflowId, executionId } = await params

  try {
    // Verify workflow belongs to this org
    const [workflowData] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(and(eq(workflows.id, workflowId as any), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!workflowData) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 })
    }

    logger.info('Cancel execution requested', { workflowId, executionId })

    const result = cancelExecution(executionId)

    // Also update the execution log in the DB if it exists and is still running
    if (result.cancelled) {
      try {
        await db
          .update(workflowExecutionLogs)
          .set({
            status: 'cancelled',
            endedAt: new Date(),
          })
          .where(
            and(
              eq(workflowExecutionLogs.executionId, executionId as any),
              eq(workflowExecutionLogs.status, 'running')
            )
          )
      } catch (dbError) {
        logger.error('Failed to update execution log status', { executionId, error: dbError })
      }
    }

    return Response.json({
      success: result.cancelled,
      executionId,
      reason: result.reason,
    })
  } catch (error: any) {
    logger.error('Failed to cancel execution', {
      workflowId,
      executionId,
      error: error.message,
    })
    return Response.json(
      { error: error.message || 'Failed to cancel execution' },
      { status: 500 }
    )
  }
}

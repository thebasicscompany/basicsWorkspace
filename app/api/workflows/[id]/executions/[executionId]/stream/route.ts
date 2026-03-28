/**
 * Execution stream endpoint — SSE stream for execution results.
 * Adapted from Sim's app/api/workflows/[id]/executions/[executionId]/stream/route.ts
 *
 * For completed executions: replays all block logs as SSE events.
 * For running executions: polls the DB until complete, then streams results.
 *
 * Note: Sim uses a Redis event buffer for live streaming. We write execution
 * data directly to the DB, so this endpoint polls workflowExecutionLogs instead.
 * Can be upgraded to a proper event buffer when needed.
 */
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workflows, workflowExecutionLogs } from '@/lib/db/schema'
import { requireOrg } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/sim/logger'

const logger = createLogger('ExecutionStreamAPI')

const POLL_INTERVAL_MS = 500
const MAX_POLL_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const MAX_NOT_FOUND_WAIT_MS = 10 * 1000 // Give up if execution never appears after 10s

type Params = Promise<{ id: string; executionId: string }>

function isTerminalStatus(status: string): boolean {
  return status === 'success' || status === 'error' || status === 'cancelled'
}

export async function GET(req: Request, { params }: { params: Params }) {
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

    const encoder = new TextEncoder()
    let closed = false

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (data: unknown) => {
          if (closed) return
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch {
            closed = true
          }
        }

        try {
          const pollDeadline = Date.now() + MAX_POLL_DURATION_MS
          const notFoundDeadline = Date.now() + MAX_NOT_FOUND_WAIT_MS
          let executionFound = false

          // Poll until execution is complete or timeout
          while (!closed && Date.now() < pollDeadline) {
            const [execution] = await db
              .select()
              .from(workflowExecutionLogs)
              .where(
                and(
                  eq(workflowExecutionLogs.workflowId, workflowId as any),
                  eq(workflowExecutionLogs.executionId, executionId as any)
                )
              )
              .limit(1)

            if (!execution) {
              // Give up if execution never appears
              if (!executionFound && Date.now() > notFoundDeadline) {
                send({ type: 'error', error: 'Execution not found' })
                break
              }
              await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
              continue
            }
            executionFound = true

            if (execution.workflowId !== workflowId) {
              send({ type: 'error', error: 'Execution does not belong to this workflow' })
              break
            }

            if (isTerminalStatus(execution.status)) {
              // Replay block logs as SSE events
              const logs = (execution.executionData as any[]) || []
              for (const log of logs) {
                if (closed) break
                send({
                  type: 'block:complete',
                  blockId: log.blockId,
                  blockName: log.blockName,
                  blockType: log.blockType,
                  output: log.output,
                  durationMs: log.durationMs,
                })
              }

              send({
                type: 'complete',
                executionId,
                status: execution.status,
                startedAt: execution.startedAt,
                endedAt: execution.endedAt,
                totalDurationMs: execution.totalDurationMs,
              })
              break
            }

            // Still running — wait and poll again
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
          }

          if (!closed && Date.now() >= pollDeadline) {
            logger.warn('Execution stream poll deadline reached', { executionId })
            send({ type: 'timeout', executionId })
          }

          if (!closed) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        } catch (error) {
          logger.error('Error in execution stream', {
            executionId,
            error: error instanceof Error ? error.message : String(error),
          })
          if (!closed) {
            try {
              controller.close()
            } catch {}
          }
        }
      },
      cancel() {
        closed = true
        logger.info('Client disconnected from execution stream', { executionId })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Connection: 'keep-alive',
        'X-Execution-Id': executionId,
      },
    })
  } catch (error: any) {
    logger.error('Failed to start execution stream', {
      workflowId,
      executionId,
      error: error.message,
    })
    return Response.json(
      { error: error.message || 'Failed to start execution stream' },
      { status: 500 }
    )
  }
}

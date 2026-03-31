import type { Task } from '@a2a-js/sdk'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createA2AClient } from '@/lib/a2a/utils'
import { generateRequestId } from '@/lib/core/utils/request'

const logger = { info: (...args: any[]) => console.log('[a2a-cancel-task]', ...args), warn: (...args: any[]) => console.warn('[a2a-cancel-task]', ...args), error: (...args: any[]) => console.error('[a2a-cancel-task]', ...args) }

export const dynamic = 'force-dynamic'

const A2ACancelTaskSchema = z.object({
  agentUrl: z.string().min(1, 'Agent URL is required'),
  taskId: z.string().min(1, 'Task ID is required'),
  apiKey: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const validatedData = A2ACancelTaskSchema.parse(body)

    logger.info(`[${requestId}] Canceling A2A task`, {
      agentUrl: validatedData.agentUrl,
      taskId: validatedData.taskId,
    })

    const client = await createA2AClient(validatedData.agentUrl, validatedData.apiKey)

    const task = (await client.cancelTask({ id: validatedData.taskId })) as Task

    logger.info(`[${requestId}] Successfully canceled A2A task`, {
      taskId: validatedData.taskId,
      state: task.status.state,
    })

    return NextResponse.json({
      success: true,
      output: {
        cancelled: true,
        state: task.status.state,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid A2A cancel task request`, {
        errors: error.issues,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error canceling A2A task:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel task',
      },
      { status: 500 }
    )
  }
}

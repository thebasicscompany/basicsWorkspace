import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createA2AClient } from '@/lib/a2a/utils'
import { generateRequestId } from '@/lib/core/utils/request'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[a2a-get-push-notification]', ...args), warn: (...args: any[]) => console.warn('[a2a-get-push-notification]', ...args), error: (...args: any[]) => console.error('[a2a-get-push-notification]', ...args) }

const A2AGetPushNotificationSchema = z.object({
  agentUrl: z.string().min(1, 'Agent URL is required'),
  taskId: z.string().min(1, 'Task ID is required'),
  apiKey: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const validatedData = A2AGetPushNotificationSchema.parse(body)

    logger.info(`[${requestId}] Getting push notification config`, {
      agentUrl: validatedData.agentUrl,
      taskId: validatedData.taskId,
    })

    const client = await createA2AClient(validatedData.agentUrl, validatedData.apiKey)

    const result = await client.getTaskPushNotificationConfig({
      id: validatedData.taskId,
    })

    if (!result || !result.pushNotificationConfig) {
      logger.info(`[${requestId}] No push notification config found for task`, {
        taskId: validatedData.taskId,
      })
      return NextResponse.json({
        success: true,
        output: {
          exists: false,
        },
      })
    }

    logger.info(`[${requestId}] Push notification config retrieved successfully`, {
      taskId: validatedData.taskId,
    })

    return NextResponse.json({
      success: true,
      output: {
        url: result.pushNotificationConfig.url,
        token: result.pushNotificationConfig.token,
        exists: true,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request data`, { errors: error.issues })
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('not found')) {
      logger.info(`[${requestId}] Task not found, returning exists: false`)
      return NextResponse.json({
        success: true,
        output: {
          exists: false,
        },
      })
    }

    logger.error(`[${requestId}] Error getting A2A push notification:`, error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get push notification',
      },
      { status: 500 }
    )
  }
}

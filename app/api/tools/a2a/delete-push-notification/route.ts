import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createA2AClient } from '@/lib/a2a/utils'
import { generateRequestId } from '@/lib/core/utils/request'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[a2a-delete-push-notification]', ...args), warn: (...args: any[]) => console.warn('[a2a-delete-push-notification]', ...args), error: (...args: any[]) => console.error('[a2a-delete-push-notification]', ...args) }

const A2ADeletePushNotificationSchema = z.object({
  agentUrl: z.string().min(1, 'Agent URL is required'),
  taskId: z.string().min(1, 'Task ID is required'),
  pushNotificationConfigId: z.string().optional(),
  apiKey: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const validatedData = A2ADeletePushNotificationSchema.parse(body)

    logger.info(`[${requestId}] Deleting A2A push notification config`, {
      agentUrl: validatedData.agentUrl,
      taskId: validatedData.taskId,
      pushNotificationConfigId: validatedData.pushNotificationConfigId,
    })

    const client = await createA2AClient(validatedData.agentUrl, validatedData.apiKey)

    await client.deleteTaskPushNotificationConfig({
      id: validatedData.taskId,
      pushNotificationConfigId: validatedData.pushNotificationConfigId || validatedData.taskId,
    })

    logger.info(`[${requestId}] Push notification config deleted successfully`, {
      taskId: validatedData.taskId,
    })

    return NextResponse.json({
      success: true,
      output: {
        success: true,
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

    logger.error(`[${requestId}] Error deleting A2A push notification:`, error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete push notification',
      },
      { status: 500 }
    )
  }
}

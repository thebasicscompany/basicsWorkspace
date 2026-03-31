import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateRequestId } from '@/lib/core/utils/request'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[outlook-delete]', ...args), warn: (...args: any[]) => console.warn('[outlook-delete]', ...args), error: (...args: any[]) => console.error('[outlook-delete]', ...args) }

const OutlookDeleteSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  messageId: z.string().min(1, 'Message ID is required'),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const validatedData = OutlookDeleteSchema.parse(body)

    logger.info(`[${requestId}] Deleting Outlook email`, {
      messageId: validatedData.messageId,
    })

    const graphEndpoint = `https://graph.microsoft.com/v1.0/me/messages/${validatedData.messageId}`

    logger.info(`[${requestId}] Sending to Microsoft Graph API: ${graphEndpoint}`)

    const graphResponse = await fetch(graphEndpoint, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${validatedData.accessToken}`,
      },
    })

    if (!graphResponse.ok) {
      const errorData = await graphResponse.json().catch(() => ({}))
      logger.error(`[${requestId}] Microsoft Graph API error:`, errorData)
      return NextResponse.json(
        {
          success: false,
          error: errorData.error?.message || 'Failed to delete email',
        },
        { status: graphResponse.status }
      )
    }

    logger.info(`[${requestId}] Email deleted successfully`, {
      messageId: validatedData.messageId,
    })

    return NextResponse.json({
      success: true,
      output: {
        message: 'Email moved to Deleted Items successfully',
        messageId: validatedData.messageId,
        status: 'deleted',
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

    logger.error(`[${requestId}] Error deleting Outlook email:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

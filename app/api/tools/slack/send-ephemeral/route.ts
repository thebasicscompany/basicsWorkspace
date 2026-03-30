import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateRequestId } from '@/lib/core/utils/request'

export const dynamic = 'force-dynamic'

const logger = {
  info: (...args: any[]) => console.log('[SlackSendEphemeralAPI]', ...args),
  warn: (...args: any[]) => console.warn('[SlackSendEphemeralAPI]', ...args),
  error: (...args: any[]) => console.error('[SlackSendEphemeralAPI]', ...args),
}

const SlackSendEphemeralSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  channel: z.string().min(1, 'Channel ID is required'),
  user: z.string().min(1, 'User ID is required'),
  text: z.string().min(1, 'Message text is required'),
  thread_ts: z.string().optional().nullable(),
  blocks: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    // Internal tool routes are called server-side by the executor.
    // Auth is handled at the executor level.

    const body = await request.json()
    const validatedData = SlackSendEphemeralSchema.parse(body)

    logger.info(`[${requestId}] Sending ephemeral message`, {
      channel: validatedData.channel,
      user: validatedData.user,
      threadTs: validatedData.thread_ts ?? undefined,
    })

    const response = await fetch('https://slack.com/api/chat.postEphemeral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validatedData.accessToken}`,
      },
      body: JSON.stringify({
        channel: validatedData.channel,
        user: validatedData.user,
        text: validatedData.text,
        ...(validatedData.thread_ts && { thread_ts: validatedData.thread_ts }),
        ...(validatedData.blocks &&
          validatedData.blocks.length > 0 && { blocks: validatedData.blocks }),
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      logger.error(`[${requestId}] Slack API error:`, data.error)
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to send ephemeral message' },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Ephemeral message sent successfully`)

    return NextResponse.json({
      success: true,
      output: {
        messageTs: data.message_ts,
        channel: validatedData.channel,
      },
    })
  } catch (error) {
    logger.error(`[${requestId}] Error sending ephemeral message:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

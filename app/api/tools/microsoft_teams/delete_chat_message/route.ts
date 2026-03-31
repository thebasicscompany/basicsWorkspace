import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateRequestId } from '@/lib/core/utils/request'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[microsoft_teams-delete_chat_message]', ...args), warn: (...args: any[]) => console.warn('[microsoft_teams-delete_chat_message]', ...args), error: (...args: any[]) => console.error('[microsoft_teams-delete_chat_message]', ...args) }

const TeamsDeleteChatMessageSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
  messageId: z.string().min(1, 'Message ID is required'),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const validatedData = TeamsDeleteChatMessageSchema.parse(body)

    logger.info(`[${requestId}] Deleting Teams chat message`, {
      chatId: validatedData.chatId,
      messageId: validatedData.messageId,
    })

    // First, get the current user's ID (required for chat message deletion endpoint)
    const meUrl = 'https://graph.microsoft.com/v1.0/me'
    const meResponse = await fetch(meUrl, {
      headers: {
        Authorization: `Bearer ${validatedData.accessToken}`,
      },
    })

    if (!meResponse.ok) {
      const errorData = await meResponse.json().catch(() => ({}))
      logger.error(`[${requestId}] Failed to get user ID:`, errorData)
      return NextResponse.json(
        {
          success: false,
          error: errorData.error?.message || 'Failed to get user information',
        },
        { status: meResponse.status }
      )
    }

    const userData = await meResponse.json()
    const userId = userData.id

    logger.info(`[${requestId}] Retrieved user ID: ${userId}`)

    // Now perform the softDelete operation using the correct endpoint format
    const deleteUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/chats/${encodeURIComponent(validatedData.chatId)}/messages/${encodeURIComponent(validatedData.messageId)}/softDelete`

    const deleteResponse = await fetch(deleteUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validatedData.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // softDelete requires an empty JSON body
    })

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json().catch(() => ({}))
      logger.error(`[${requestId}] Microsoft Teams API delete error:`, errorData)
      return NextResponse.json(
        {
          success: false,
          error: errorData.error?.message || 'Failed to delete Teams message',
        },
        { status: deleteResponse.status }
      )
    }

    logger.info(`[${requestId}] Teams message deleted successfully`)

    return NextResponse.json({
      success: true,
      output: {
        deleted: true,
        messageId: validatedData.messageId,
        metadata: {
          messageId: validatedData.messageId,
          chatId: validatedData.chatId,
        },
      },
    })
  } catch (error) {
    logger.error(`[${requestId}] Error deleting Teams chat message:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

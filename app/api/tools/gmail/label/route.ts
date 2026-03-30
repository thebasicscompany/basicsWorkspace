import { type NextRequest, NextResponse } from 'next/server'
import { validateAlphanumericId } from '@/lib/core/security/input-validation'
import { generateRequestId } from '@/lib/core/utils/request'

export const dynamic = 'force-dynamic'

const logger = {
  info: (...args: any[]) => console.log('[GmailLabelAPI]', ...args),
  warn: (...args: any[]) => console.warn('[GmailLabelAPI]', ...args),
  error: (...args: any[]) => console.error('[GmailLabelAPI]', ...args),
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const { searchParams } = new URL(request.url)
    const credentialId = searchParams.get('credentialId')
    const labelId = searchParams.get('labelId')

    if (!credentialId || !labelId) {
      logger.warn(`[${requestId}] Missing required parameters`)
      return NextResponse.json(
        { error: 'Credential ID and Label ID are required' },
        { status: 400 }
      )
    }

    const labelIdValidation = validateAlphanumericId(labelId, 'labelId', 255)
    if (!labelIdValidation.isValid) {
      logger.warn(`[${requestId}] Invalid label ID: ${labelIdValidation.error}`)
      return NextResponse.json({ error: labelIdValidation.error }, { status: 400 })
    }

    // For now, treat credentialId as a direct access token.
    // Full OAuth credential resolution (resolveOAuthAccountId + refreshAccessTokenIfNeeded)
    // will be wired once the OAuth infrastructure is complete.
    const accessToken = credentialId

    logger.info(`[${requestId}] Fetching label ${labelId} from Gmail API`)
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    logger.info(`[${requestId}] Gmail API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`[${requestId}] Gmail API error response: ${errorText}`)

      try {
        const error = JSON.parse(errorText)
        return NextResponse.json({ error }, { status: response.status })
      } catch (_e) {
        return NextResponse.json({ error: errorText }, { status: response.status })
      }
    }

    const label = await response.json()

    let formattedName = label.name

    if (label.type === 'system') {
      formattedName = label.name.charAt(0).toUpperCase() + label.name.slice(1).toLowerCase()
    }

    const formattedLabel = {
      id: label.id,
      name: formattedName,
      type: label.type,
      messagesTotal: label.messagesTotal || 0,
      messagesUnread: label.messagesUnread || 0,
    }

    return NextResponse.json({ label: formattedLabel }, { status: 200 })
  } catch (error) {
    logger.error(`[${requestId}] Error fetching Gmail label:`, error)
    return NextResponse.json({ error: 'Failed to fetch Gmail label' }, { status: 500 })
  }
}

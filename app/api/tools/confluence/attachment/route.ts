import { type NextRequest, NextResponse } from 'next/server'
import { validateAlphanumericId, validateJiraCloudId } from '@/lib/core/security/input-validation'
import { getConfluenceCloudId } from '@/lib/tools/confluence/utils'

const logger = { info: (...args: any[]) => console.log('[confluence-attachment]', ...args), warn: (...args: any[]) => console.warn('[confluence-attachment]', ...args), error: (...args: any[]) => console.error('[confluence-attachment]', ...args) }

export const dynamic = 'force-dynamic'

// Delete an attachment
export async function DELETE(request: NextRequest) {
  try {

    const { domain, accessToken, cloudId: providedCloudId, attachmentId } = await request.json()

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })
    }

    const attachmentIdValidation = validateAlphanumericId(attachmentId, 'attachmentId', 255)
    if (!attachmentIdValidation.isValid) {
      return NextResponse.json({ error: attachmentIdValidation.error }, { status: 400 })
    }

    const cloudId = providedCloudId || (await getConfluenceCloudId(domain, accessToken))

    const cloudIdValidation = validateJiraCloudId(cloudId, 'cloudId')
    if (!cloudIdValidation.isValid) {
      return NextResponse.json({ error: cloudIdValidation.error }, { status: 400 })
    }

    const url = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/api/v2/attachments/${attachmentId}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      logger.error('Confluence API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: JSON.stringify(errorData, null, 2),
      })
      const errorMessage =
        errorData?.message || `Failed to delete Confluence attachment (${response.status})`
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    return NextResponse.json({ attachmentId, deleted: true })
  } catch (error) {
    logger.error('Error deleting Confluence attachment:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    )
  }
}

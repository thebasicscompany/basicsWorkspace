import { type NextRequest, NextResponse } from 'next/server'
import { validateAlphanumericId, validateJiraCloudId } from '@/lib/core/security/input-validation'
import { getConfluenceCloudId } from '@/lib/tools/confluence/utils'

const logger = { info: (...args: any[]) => console.log('[confluence-space-labels]', ...args), warn: (...args: any[]) => console.warn('[confluence-space-labels]', ...args), error: (...args: any[]) => console.error('[confluence-space-labels]', ...args) }

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {

    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    const accessToken = searchParams.get('accessToken')
    const spaceId = searchParams.get('spaceId')
    const providedCloudId = searchParams.get('cloudId')
    const limit = searchParams.get('limit') || '25'
    const cursor = searchParams.get('cursor')

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    if (!spaceId) {
      return NextResponse.json({ error: 'Space ID is required' }, { status: 400 })
    }

    const spaceIdValidation = validateAlphanumericId(spaceId, 'spaceId', 255)
    if (!spaceIdValidation.isValid) {
      return NextResponse.json({ error: spaceIdValidation.error }, { status: 400 })
    }

    const cloudId = providedCloudId || (await getConfluenceCloudId(domain, accessToken))

    const cloudIdValidation = validateJiraCloudId(cloudId, 'cloudId')
    if (!cloudIdValidation.isValid) {
      return NextResponse.json({ error: cloudIdValidation.error }, { status: 400 })
    }

    const queryParams = new URLSearchParams()
    queryParams.append('limit', String(Math.min(Number(limit), 250)))
    if (cursor) {
      queryParams.append('cursor', cursor)
    }
    const url = `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/api/v2/spaces/${spaceId}/labels?${queryParams.toString()}`

    const response = await fetch(url, {
      method: 'GET',
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
      const errorMessage = errorData?.message || `Failed to list space labels (${response.status})`
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const data = await response.json()

    const labels = (data.results || []).map((label: any) => ({
      id: label.id,
      name: label.name,
      prefix: label.prefix || 'global',
    }))

    return NextResponse.json({
      labels,
      spaceId,
      nextCursor: data._links?.next
        ? new URL(data._links.next, 'https://placeholder').searchParams.get('cursor')
        : null,
    })
  } catch (error) {
    logger.error('Error listing space labels:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    )
  }
}

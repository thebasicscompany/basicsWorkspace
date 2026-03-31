import { NextResponse } from 'next/server'
import { validateJiraCloudId } from '@/lib/core/security/input-validation'
import { getConfluenceCloudId } from '@/lib/tools/confluence/utils'

const logger = { info: (...args: any[]) => console.log('[confluence-selector-spaces]', ...args), warn: (...args: any[]) => console.warn('[confluence-selector-spaces]', ...args), error: (...args: any[]) => console.error('[confluence-selector-spaces]', ...args) }

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { credential, workflowId, domain, accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const cloudId = await getConfluenceCloudId(domain, accessToken)

    const cloudIdValidation = validateJiraCloudId(cloudId, 'cloudId')
    if (!cloudIdValidation.isValid) {
      return NextResponse.json({ error: cloudIdValidation.error }, { status: 400 })
    }

    const url = `https://api.atlassian.com/ex/confluence/${cloudIdValidation.sanitized}/wiki/api/v2/spaces?limit=250`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      logger.error('Confluence API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })
      const errorMessage =
        errorData?.message || `Failed to list Confluence spaces (${response.status})`
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const data = await response.json()
    const spaces = (data.results || []).map((space: { id: string; name: string; key: string }) => ({
      id: space.id,
      name: space.name,
      key: space.key,
    }))

    return NextResponse.json({ spaces })
  } catch (error) {
    logger.error('Error listing Confluence spaces:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    )
  }
}

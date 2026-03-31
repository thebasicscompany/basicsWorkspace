import { NextResponse } from 'next/server'
import { validateAlphanumericId } from '@/lib/core/security/input-validation'
const logger = { info: (...args: any[]) => console.log('[webflow-collections]', ...args), warn: (...args: any[]) => console.warn('[webflow-collections]', ...args), error: (...args: any[]) => console.error('[webflow-collections]', ...args) }

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { credential, workflowId, siteId, accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    const siteIdValidation = validateAlphanumericId(siteId, 'siteId')
    if (!siteIdValidation.isValid) {
      logger.error('Invalid siteId', { error: siteIdValidation.error })
      return NextResponse.json({ error: siteIdValidation.error }, { status: 400 })
    }

    const response = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Webflow collections', {
        status: response.status,
        error: errorData,
        siteId,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Webflow collections', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const collections = data.collections || []

    const formattedCollections = collections.map((collection: any) => ({
      id: collection.id,
      name: collection.displayName || collection.slug || collection.id,
    }))

    return NextResponse.json({ collections: formattedCollections })
  } catch (error) {
    logger.error('Error processing Webflow collections request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Webflow collections', details: (error as Error).message },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { extractTitleFromItem } from '@/lib/tools/notion/utils'

const logger = { info: (...args: any[]) => console.log('[notion-databases]', ...args), warn: (...args: any[]) => console.warn('[notion-databases]', ...args), error: (...args: any[]) => console.error('[notion-databases]', ...args) }

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { credential, workflowId, accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: { value: 'database', property: 'object' },
        page_size: 100,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Notion databases', {
        status: response.status,
        error: errorData,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Notion databases', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const databases = (data.results || []).map((db: Record<string, unknown>) => ({
      id: db.id as string,
      name: extractTitleFromItem(db),
    }))

    return NextResponse.json({ databases })
  } catch (error) {
    logger.error('Error processing Notion databases request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Notion databases', details: (error as Error).message },
      { status: 500 }
    )
  }
}

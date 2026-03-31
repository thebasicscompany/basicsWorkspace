import { NextResponse } from 'next/server'
const logger = { info: (...args: any[]) => console.log('[attio-lists]', ...args), warn: (...args: any[]) => console.warn('[attio-lists]', ...args), error: (...args: any[]) => console.error('[attio-lists]', ...args) }

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { credential, workflowId, accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    const response = await fetch('https://api.attio.com/v2/lists', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Attio lists', {
        status: response.status,
        error: errorData,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Attio lists', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const lists = (data.data || []).map((list: { api_slug: string; name: string }) => ({
      id: list.api_slug,
      name: list.name,
    }))

    return NextResponse.json({ lists })
  } catch (error) {
    logger.error('Error processing Attio lists request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Attio lists', details: (error as Error).message },
      { status: 500 }
    )
  }
}

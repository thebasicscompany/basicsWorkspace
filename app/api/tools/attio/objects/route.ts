import { NextResponse } from 'next/server'
const logger = { info: (...args: any[]) => console.log('[attio-objects]', ...args), warn: (...args: any[]) => console.warn('[attio-objects]', ...args), error: (...args: any[]) => console.error('[attio-objects]', ...args) }

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { credential, workflowId, accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    const response = await fetch('https://api.attio.com/v2/objects', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Attio objects', {
        status: response.status,
        error: errorData,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Attio objects', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const objects = (data.data || []).map((obj: { api_slug: string; singular_noun: string }) => ({
      id: obj.api_slug,
      name: obj.singular_noun,
    }))

    return NextResponse.json({ objects })
  } catch (error) {
    logger.error('Error processing Attio objects request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Attio objects', details: (error as Error).message },
      { status: 500 }
    )
  }
}

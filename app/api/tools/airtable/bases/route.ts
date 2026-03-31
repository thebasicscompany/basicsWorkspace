import { NextResponse } from 'next/server'
const logger = { info: (...args: any[]) => console.log('[airtable-bases]', ...args), warn: (...args: any[]) => console.warn('[airtable-bases]', ...args), error: (...args: any[]) => console.error('[airtable-bases]', ...args) }

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { credential, workflowId, accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    const response = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Airtable bases', {
        status: response.status,
        error: errorData,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Airtable bases', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const bases = (data.bases || []).map((base: { id: string; name: string }) => ({
      id: base.id,
      name: base.name,
    }))

    return NextResponse.json({ bases })
  } catch (error) {
    logger.error('Error processing Airtable bases request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Airtable bases', details: (error as Error).message },
      { status: 500 }
    )
  }
}

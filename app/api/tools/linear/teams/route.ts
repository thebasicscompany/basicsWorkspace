import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[LinearTeamsAPI]', ...args), warn: (...args: any[]) => console.warn('[LinearTeamsAPI]', ...args), error: (...args: any[]) => console.error('[LinearTeamsAPI]', ...args) }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: `query { teams { nodes { id name } } }`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Linear teams', {
        status: response.status,
        error: errorData,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Linear teams', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const teams = (data.data?.teams?.nodes || []).map((team: any) => ({
      id: team.id,
      name: team.name,
    }))

    return NextResponse.json({ teams })
  } catch (error) {
    logger.error('Error processing Linear teams request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Linear teams', details: (error as Error).message },
      { status: 500 }
    )
  }
}

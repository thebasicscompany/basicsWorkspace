import { NextResponse } from 'next/server'
const logger = { info: (...args: any[]) => console.log('[trello-boards]', ...args), warn: (...args: any[]) => console.warn('[trello-boards]', ...args), error: (...args: any[]) => console.error('[trello-boards]', ...args) }

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.TRELLO_API_KEY
    if (!apiKey) {
      logger.error('Trello API key not configured')
      return NextResponse.json({ error: 'Trello API key not configured' }, { status: 500 })
    }
    const body = await request.json()
    const { credential, workflowId, accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    const response = await fetch(
      `https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${accessToken}&fields=id,name,closed`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Trello boards', {
        status: response.status,
        error: errorData,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Trello boards', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const boards = (data || []).map((board: { id: string; name: string; closed: boolean }) => ({
      id: board.id,
      name: board.name,
      closed: board.closed,
    }))

    return NextResponse.json({ boards })
  } catch (error) {
    logger.error('Error processing Trello boards request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Trello boards', details: (error as Error).message },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
const logger = { info: (...args: any[]) => console.log('[asana-workspaces]', ...args), warn: (...args: any[]) => console.warn('[asana-workspaces]', ...args), error: (...args: any[]) => console.error('[asana-workspaces]', ...args) }

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { credential, workflowId, accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    const response = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Asana workspaces', {
        status: response.status,
        error: errorData,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Asana workspaces', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const workspaces = (data.data || []).map((workspace: { gid: string; name: string }) => ({
      id: workspace.gid,
      name: workspace.name,
    }))

    return NextResponse.json({ workspaces })
  } catch (error) {
    logger.error('Error processing Asana workspaces request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Asana workspaces', details: (error as Error).message },
      { status: 500 }
    )
  }
}

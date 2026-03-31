import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[LinearProjectsAPI]', ...args), warn: (...args: any[]) => console.warn('[LinearProjectsAPI]', ...args), error: (...args: any[]) => console.error('[LinearProjectsAPI]', ...args) }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accessToken, teamId } = body

    if (!accessToken || !teamId) {
      logger.error('Missing access token or teamId in request')
      return NextResponse.json({ error: 'Access token and teamId are required' }, { status: 400 })
    }

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: `query($teamId: String!) { team(id: $teamId) { projects { nodes { id name } } } }`,
        variables: { teamId },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Linear projects', {
        status: response.status,
        error: errorData,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Linear projects', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const projects = (data.data?.team?.projects?.nodes || []).map((project: any) => ({
      id: project.id,
      name: project.name,
    }))

    if (projects.length === 0) {
      logger.info('No projects found for team', { teamId })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    logger.error('Error processing Linear projects request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Linear projects', details: (error as Error).message },
      { status: 500 }
    )
  }
}

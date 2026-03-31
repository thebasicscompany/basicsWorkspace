import { NextResponse } from 'next/server'
import { validateAirtableId } from '@/lib/core/security/input-validation'
const logger = { info: (...args: any[]) => console.log('[airtable-tables]', ...args), warn: (...args: any[]) => console.warn('[airtable-tables]', ...args), error: (...args: any[]) => console.error('[airtable-tables]', ...args) }

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { credential, workflowId, baseId, accessToken } = body

    if (!accessToken) {
      logger.error('Missing access token in request')
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    if (!baseId) {
      logger.error('Missing baseId in request')
      return NextResponse.json({ error: 'Base ID is required' }, { status: 400 })
    }

    const baseIdValidation = validateAirtableId(baseId, 'app', 'baseId')
    if (!baseIdValidation.isValid) {
      logger.error('Invalid baseId', { error: baseIdValidation.error })
      return NextResponse.json({ error: baseIdValidation.error }, { status: 400 })
    }

    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseIdValidation.sanitized}/tables`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to fetch Airtable tables', {
        status: response.status,
        error: errorData,
        baseId,
      })
      return NextResponse.json(
        { error: 'Failed to fetch Airtable tables', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const tables = (data.tables || []).map((table: { id: string; name: string }) => ({
      id: table.id,
      name: table.name,
    }))

    return NextResponse.json({ tables })
  } catch (error) {
    logger.error('Error processing Airtable tables request:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve Airtable tables', details: (error as Error).message },
      { status: 500 }
    )
  }
}

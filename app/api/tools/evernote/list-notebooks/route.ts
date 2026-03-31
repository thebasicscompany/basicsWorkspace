import { type NextRequest, NextResponse } from 'next/server'
import { listNotebooks } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-list-notebooks]', ...args), warn: (...args: any[]) => console.warn('[evernote-list-notebooks]', ...args), error: (...args: any[]) => console.error('[evernote-list-notebooks]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey } = body

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'apiKey is required' }, { status: 400 })
    }

    const notebooks = await listNotebooks(apiKey)

    return NextResponse.json({
      success: true,
      output: { notebooks },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to list notebooks', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

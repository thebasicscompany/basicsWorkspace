import { type NextRequest, NextResponse } from 'next/server'
import { getNote } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-get-note]', ...args), warn: (...args: any[]) => console.warn('[evernote-get-note]', ...args), error: (...args: any[]) => console.error('[evernote-get-note]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, noteGuid, withContent = true } = body

    if (!apiKey || !noteGuid) {
      return NextResponse.json(
        { success: false, error: 'apiKey and noteGuid are required' },
        { status: 400 }
      )
    }

    const note = await getNote(apiKey, noteGuid, withContent)

    return NextResponse.json({
      success: true,
      output: { note },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to get note', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

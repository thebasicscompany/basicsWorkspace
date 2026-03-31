import { type NextRequest, NextResponse } from 'next/server'
import { copyNote } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-copy-note]', ...args), warn: (...args: any[]) => console.warn('[evernote-copy-note]', ...args), error: (...args: any[]) => console.error('[evernote-copy-note]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, noteGuid, toNotebookGuid } = body

    if (!apiKey || !noteGuid || !toNotebookGuid) {
      return NextResponse.json(
        { success: false, error: 'apiKey, noteGuid, and toNotebookGuid are required' },
        { status: 400 }
      )
    }

    const note = await copyNote(apiKey, noteGuid, toNotebookGuid)

    return NextResponse.json({
      success: true,
      output: { note },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to copy note', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

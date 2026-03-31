import { type NextRequest, NextResponse } from 'next/server'
import { deleteNote } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-delete-note]', ...args), warn: (...args: any[]) => console.warn('[evernote-delete-note]', ...args), error: (...args: any[]) => console.error('[evernote-delete-note]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, noteGuid } = body

    if (!apiKey || !noteGuid) {
      return NextResponse.json(
        { success: false, error: 'apiKey and noteGuid are required' },
        { status: 400 }
      )
    }

    await deleteNote(apiKey, noteGuid)

    return NextResponse.json({
      success: true,
      output: {
        success: true,
        noteGuid,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to delete note', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

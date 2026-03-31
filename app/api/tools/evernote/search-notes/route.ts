import { type NextRequest, NextResponse } from 'next/server'
import { searchNotes } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-search-notes]', ...args), warn: (...args: any[]) => console.warn('[evernote-search-notes]', ...args), error: (...args: any[]) => console.error('[evernote-search-notes]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, query, notebookGuid, offset = 0, maxNotes = 25 } = body

    if (!apiKey || !query) {
      return NextResponse.json(
        { success: false, error: 'apiKey and query are required' },
        { status: 400 }
      )
    }

    const clampedMaxNotes = Math.min(Math.max(Number(maxNotes) || 25, 1), 250)

    const result = await searchNotes(
      apiKey,
      query,
      notebookGuid || undefined,
      Number(offset),
      clampedMaxNotes
    )

    return NextResponse.json({
      success: true,
      output: {
        totalNotes: result.totalNotes,
        notes: result.notes,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to search notes', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

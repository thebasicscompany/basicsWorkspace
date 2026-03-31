import { type NextRequest, NextResponse } from 'next/server'
import { updateNote } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-update-note]', ...args), warn: (...args: any[]) => console.warn('[evernote-update-note]', ...args), error: (...args: any[]) => console.error('[evernote-update-note]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, noteGuid, title, content, notebookGuid, tagNames } = body

    if (!apiKey || !noteGuid) {
      return NextResponse.json(
        { success: false, error: 'apiKey and noteGuid are required' },
        { status: 400 }
      )
    }

    const parsedTags = tagNames
      ? (() => {
          const tags =
            typeof tagNames === 'string'
              ? tagNames
                  .split(',')
                  .map((t: string) => t.trim())
                  .filter(Boolean)
              : tagNames
          return tags.length > 0 ? tags : undefined
        })()
      : undefined

    const note = await updateNote(
      apiKey,
      noteGuid,
      title || undefined,
      content || undefined,
      notebookGuid || undefined,
      parsedTags
    )

    return NextResponse.json({
      success: true,
      output: { note },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to update note', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

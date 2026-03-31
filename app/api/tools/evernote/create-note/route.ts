import { type NextRequest, NextResponse } from 'next/server'
import { createNote } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-create-note]', ...args), warn: (...args: any[]) => console.warn('[evernote-create-note]', ...args), error: (...args: any[]) => console.error('[evernote-create-note]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, title, content, notebookGuid, tagNames } = body

    if (!apiKey || !title || !content) {
      return NextResponse.json(
        { success: false, error: 'apiKey, title, and content are required' },
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

    const note = await createNote(apiKey, title, content, notebookGuid || undefined, parsedTags)

    return NextResponse.json({
      success: true,
      output: { note },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to create note', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

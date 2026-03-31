import { type NextRequest, NextResponse } from 'next/server'
import { getNotebook } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-get-notebook]', ...args), warn: (...args: any[]) => console.warn('[evernote-get-notebook]', ...args), error: (...args: any[]) => console.error('[evernote-get-notebook]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, notebookGuid } = body

    if (!apiKey || !notebookGuid) {
      return NextResponse.json(
        { success: false, error: 'apiKey and notebookGuid are required' },
        { status: 400 }
      )
    }

    const notebook = await getNotebook(apiKey, notebookGuid)

    return NextResponse.json({
      success: true,
      output: { notebook },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to get notebook', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

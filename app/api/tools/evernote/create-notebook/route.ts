import { type NextRequest, NextResponse } from 'next/server'
import { createNotebook } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-create-notebook]', ...args), warn: (...args: any[]) => console.warn('[evernote-create-notebook]', ...args), error: (...args: any[]) => console.error('[evernote-create-notebook]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, name, stack } = body

    if (!apiKey || !name) {
      return NextResponse.json(
        { success: false, error: 'apiKey and name are required' },
        { status: 400 }
      )
    }

    const notebook = await createNotebook(apiKey, name, stack || undefined)

    return NextResponse.json({
      success: true,
      output: { notebook },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to create notebook', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from 'next/server'
import { createTag } from '@/app/api/tools/evernote/lib/client'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[evernote-create-tag]', ...args), warn: (...args: any[]) => console.warn('[evernote-create-tag]', ...args), error: (...args: any[]) => console.error('[evernote-create-tag]', ...args) }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, name, parentGuid } = body

    if (!apiKey || !name) {
      return NextResponse.json(
        { success: false, error: 'apiKey and name are required' },
        { status: 400 }
      )
    }

    const tag = await createTag(apiKey, name, parentGuid || undefined)

    return NextResponse.json({
      success: true,
      output: { tag },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to create tag', { error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

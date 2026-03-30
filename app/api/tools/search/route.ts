import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const logger = {
  info: (...args: any[]) => console.log('[SearchAPI]', ...args),
  warn: (...args: any[]) => console.warn('[SearchAPI]', ...args),
  error: (...args: any[]) => console.error('[SearchAPI]', ...args),
}

const SearchRequestSchema = z.object({
  query: z.string().min(1),
})

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    // Internal tool routes are called server-side by the executor.
    // Auth is handled at the executor level.

    const body = await request.json()
    const validated = SearchRequestSchema.parse(body)

    const exaApiKey = process.env.EXA_API_KEY

    if (!exaApiKey) {
      logger.error(`[${requestId}] No Exa API key available`)
      return NextResponse.json(
        { success: false, error: 'Search service not configured' },
        { status: 503 }
      )
    }

    logger.info(`[${requestId}] Executing search`, {
      query: validated.query,
    })

    // Direct Exa API call since we don't have the executeTool infrastructure yet
    const exaResponse = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': exaApiKey,
      },
      body: JSON.stringify({
        query: validated.query,
        type: 'auto',
        useAutoprompt: true,
        highlights: true,
      }),
    })

    if (!exaResponse.ok) {
      const errorText = await exaResponse.text()
      logger.error(`[${requestId}] Exa API error`, { status: exaResponse.status, error: errorText })
      return NextResponse.json(
        { success: false, error: `Search failed: ${exaResponse.statusText}` },
        { status: 500 }
      )
    }

    const exaData = await exaResponse.json()

    const results = (exaData.results || []).map((r: any, index: number) => ({
      title: r.title || '',
      link: r.url || '',
      snippet: Array.isArray(r.highlights) ? r.highlights.join(' ... ') : '',
      date: r.publishedDate || undefined,
      position: index + 1,
    }))

    logger.info(`[${requestId}] Search completed`, {
      resultCount: results.length,
    })

    return NextResponse.json({
      results,
      query: validated.query,
      totalResults: results.length,
      source: 'exa',
    })
  } catch (error: any) {
    logger.error(`[${requestId}] Search failed`, {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Search failed',
      },
      { status: 500 }
    )
  }
}

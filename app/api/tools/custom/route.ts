import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateRequestId } from '@/lib/core/utils/request'

const logger = { info: (...args: any[]) => console.log('[custom]', ...args), warn: (...args: any[]) => console.warn('[custom]', ...args), error: (...args: any[]) => console.error('[custom]', ...args) }

const CustomToolSchema = z.object({
  tools: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().min(1, 'Tool title is required'),
      schema: z.object({
        type: z.literal('function'),
        function: z.object({
          name: z.string().min(1, 'Function name is required'),
          description: z.string().optional(),
          parameters: z.object({
            type: z.string(),
            properties: z.record(z.string(), z.any()),
            required: z.array(z.string()).optional(),
          }),
        }),
      }),
      code: z.string(),
    })
  ),
  workspaceId: z.string().optional(),
})

// GET - Fetch all custom tools for the workspace
// NOTE: Requires customTools schema table — will be wired when workspace infra is built
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    logger.info(`[${requestId}] Custom tools GET — workspace infra not yet wired`)
    return NextResponse.json({ data: [] }, { status: 200 })
  } catch (error) {
    logger.error(`[${requestId}] Error fetching custom tools:`, error)
    return NextResponse.json({ error: 'Failed to fetch custom tools' }, { status: 500 })
  }
}

// POST - Create or update custom tools
// NOTE: Requires customTools schema table — will be wired when workspace infra is built
export async function POST(req: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await req.json()

    try {
      const { tools, workspaceId } = CustomToolSchema.parse(body)

      logger.info(`[${requestId}] Custom tools POST — workspace infra not yet wired`)
      return NextResponse.json({ success: true, data: [] })
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.warn(`[${requestId}] Invalid custom tools data`, {
          errors: validationError.issues,
        })
        return NextResponse.json(
          { error: 'Invalid request data', details: validationError.issues },
          { status: 400 }
        )
      }
      throw validationError
    }
  } catch (error) {
    logger.error(`[${requestId}] Error updating custom tools`, error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update custom tools'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// DELETE - Delete a custom tool by ID
// NOTE: Requires customTools schema table — will be wired when workspace infra is built
export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId()
  const searchParams = request.nextUrl.searchParams
  const toolId = searchParams.get('id')

  if (!toolId) {
    logger.warn(`[${requestId}] Missing tool ID for deletion`)
    return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 })
  }

  try {
    logger.info(`[${requestId}] Custom tools DELETE — workspace infra not yet wired`)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(`[${requestId}] Error deleting custom tool:`, error)
    return NextResponse.json({ error: 'Failed to delete custom tool' }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workflows } from '@/lib/db/schema'
import { requireOrg } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/sim/logger'
import { generateRequestId } from '@/lib/core/utils/request'
import { applyAutoLayout } from '@/lib/workflows/autolayout'
import {
  DEFAULT_HORIZONTAL_SPACING,
  DEFAULT_LAYOUT_PADDING,
  DEFAULT_VERTICAL_SPACING,
} from '@/lib/workflows/autolayout/constants'
import {
  loadWorkflowFromNormalizedTables,
  type NormalizedWorkflowData,
} from '@/lib/workflows/persistence/utils'

export const dynamic = 'force-dynamic'

const logger = createLogger('AutoLayoutAPI')

const AutoLayoutRequestSchema = z.object({
  spacing: z
    .object({
      horizontal: z.number().min(100).max(1000).optional(),
      vertical: z.number().min(50).max(500).optional(),
    })
    .optional()
    .default({}),
  alignment: z.enum(['start', 'center', 'end']).optional().default('center'),
  padding: z
    .object({
      x: z.number().min(50).max(500).optional(),
      y: z.number().min(50).max(500).optional(),
    })
    .optional()
    .default({}),
  gridSize: z.number().min(0).max(50).optional(),
  blocks: z.record(z.string(), z.any()).optional(),
  edges: z.array(z.any()).optional(),
  loops: z.record(z.string(), z.any()).optional(),
  parallels: z.record(z.string(), z.any()).optional(),
})

/**
 * POST /api/workflows/[id]/autolayout
 * Apply autolayout to an existing workflow
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  const { id: workflowId } = await params

  try {
    const ctx = await requireOrg(request)
    if (ctx instanceof Response) return ctx
    const { orgId, userId } = ctx

    const body = await request.json()
    const layoutOptions = AutoLayoutRequestSchema.parse(body)

    logger.info(`[${requestId}] Processing autolayout request for workflow ${workflowId}`, {
      userId,
    })

    // Verify workflow exists and belongs to this org
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId as `${string}-${string}-${string}-${string}-${string}`), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!workflow) {
      logger.warn(`[${requestId}] Workflow ${workflowId} not found for autolayout`)
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    let currentWorkflowData: NormalizedWorkflowData | null

    if (layoutOptions.blocks && layoutOptions.edges) {
      logger.info(`[${requestId}] Using provided blocks with live measurements`)
      currentWorkflowData = {
        blocks: layoutOptions.blocks as NormalizedWorkflowData['blocks'],
        edges: layoutOptions.edges as NormalizedWorkflowData['edges'],
        loops: (layoutOptions.loops || {}) as NormalizedWorkflowData['loops'],
        parallels: (layoutOptions.parallels || {}) as NormalizedWorkflowData['parallels'],
        isFromNormalizedTables: false,
      }
    } else {
      logger.info(`[${requestId}] Loading blocks from database`)
      currentWorkflowData = await loadWorkflowFromNormalizedTables(workflowId)
    }

    if (!currentWorkflowData) {
      logger.error(`[${requestId}] Could not load workflow ${workflowId} for autolayout`)
      return NextResponse.json({ error: 'Could not load workflow data' }, { status: 500 })
    }

    const autoLayoutOptions = {
      horizontalSpacing: layoutOptions.spacing?.horizontal ?? DEFAULT_HORIZONTAL_SPACING,
      verticalSpacing: layoutOptions.spacing?.vertical ?? DEFAULT_VERTICAL_SPACING,
      padding: {
        x: layoutOptions.padding?.x ?? DEFAULT_LAYOUT_PADDING.x,
        y: layoutOptions.padding?.y ?? DEFAULT_LAYOUT_PADDING.y,
      },
      alignment: layoutOptions.alignment,
      gridSize: layoutOptions.gridSize,
    }

    const layoutResult = applyAutoLayout(
      currentWorkflowData.blocks,
      currentWorkflowData.edges,
      autoLayoutOptions
    )

    if (!layoutResult.success || !layoutResult.blocks) {
      logger.error(`[${requestId}] Auto layout failed:`, {
        error: layoutResult.error,
      })
      return NextResponse.json(
        {
          error: 'Auto layout failed',
          details: layoutResult.error || 'Unknown error',
        },
        { status: 500 }
      )
    }

    const elapsed = Date.now() - startTime
    const blockCount = Object.keys(layoutResult.blocks).length

    logger.info(`[${requestId}] Autolayout completed successfully in ${elapsed}ms`, {
      blockCount,
      workflowId,
    })

    return NextResponse.json({
      success: true,
      message: `Autolayout applied successfully to ${blockCount} blocks`,
      data: {
        blockCount,
        elapsed: `${elapsed}ms`,
        layoutedBlocks: layoutResult.blocks,
      },
    })
  } catch (error) {
    const elapsed = Date.now() - startTime

    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid autolayout request data`, { errors: error.issues })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Autolayout failed after ${elapsed}ms:`, error)
    return NextResponse.json(
      {
        error: 'Autolayout failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

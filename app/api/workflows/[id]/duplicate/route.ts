/**
 * Duplicate a workflow with all its blocks, edges, and subflows.
 * Adapted from Sim's app/api/workflows/[id]/duplicate/route.ts
 */
import { z } from 'zod'
import { requireOrg } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/sim/logger'
import { duplicateWorkflow } from '@/lib/workflows/persistence/duplicate'

const logger = createLogger('WorkflowDuplicateAPI')

const DuplicateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  newId: z.string().uuid().optional(),
})

type Params = Promise<{ id: string }>

export async function POST(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { id: sourceWorkflowId } = await params
  const requestId = crypto.randomUUID()

  try {
    const body = await req.json()
    const parsed = DuplicateRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request data', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { name, description, color, newId } = parsed.data

    logger.info(`[${requestId}] Duplicating workflow ${sourceWorkflowId}`)

    const result = await duplicateWorkflow({
      sourceWorkflowId,
      orgId,
      userId,
      name,
      description,
      color,
      requestId,
      newWorkflowId: newId,
    })

    logger.info(`[${requestId}] Duplicated workflow ${sourceWorkflowId} → ${result.id}`)

    return Response.json(result, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Source workflow not found') {
      return Response.json({ error: 'Source workflow not found' }, { status: 404 })
    }

    logger.error(`[${requestId}] Error duplicating workflow ${sourceWorkflowId}:`, error)
    return Response.json({ error: 'Failed to duplicate workflow' }, { status: 500 })
  }
}

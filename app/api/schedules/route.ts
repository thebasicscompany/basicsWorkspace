/**
 * Schedule CRUD API route — simplified from Sim's app/api/schedules/route.ts
 * GET: Query schedule by workflowId (optional blockId)
 */
import { db } from '@/lib/db'
import { workflowSchedule, workflows } from '@/lib/db/schema'
import { requireOrg } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/sim/logger'
import { and, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'

const logger = createLogger('ScheduleAPI')

export async function GET(req: NextRequest) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const requestId = crypto.randomUUID()

  const url = new URL(req.url)
  const workflowId = url.searchParams.get('workflowId')

  if (!workflowId) {
    return Response.json({ error: 'Missing workflowId parameter' }, { status: 400 })
  }

  try {
    // Verify workflow belongs to org
    const [wf] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId as any), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!wf) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const schedules = await db
      .select()
      .from(workflowSchedule)
      .where(eq(workflowSchedule.workflowId, workflowId))

    logger.info(`[${requestId}] Found ${schedules.length} schedule(s) for workflow ${workflowId}`)

    return Response.json({ schedules }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching schedules`, error)
    return Response.json(
      { error: error.message || 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}

/**
 * Individual schedule CRUD: GET, PUT (enable/disable/update cron), DELETE.
 * Adapted from Sim's app/api/schedules/[id]/route.ts
 *
 * Simplifications:
 * - No workspace permission checks (uses org-scoped auth)
 * - No audit logging
 * - Uses `status` field ('active'/'disabled'/'completed')
 * - No standalone job schedules (sourceType/lifecycle/maxRuns)
 */
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { workflowSchedule, workflows } from '@/lib/db/schema'
import { requireOrg } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/sim/logger'
import { validateCronExpression } from '@/lib/workflows/schedules/utils'

const logger = createLogger('ScheduleAPI')

type Params = Promise<{ id: string }>

const scheduleUpdateSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('enable') }),
  z.object({ action: z.literal('disable') }),
  z.object({
    action: z.literal('update'),
    cronExpression: z.string().optional(),
    timezone: z.string().optional(),
  }),
])

export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id: scheduleId } = await params
  const requestId = crypto.randomUUID()

  try {
    const [schedule] = await db
      .select()
      .from(workflowSchedule)
      .where(eq(workflowSchedule.id, scheduleId))
      .limit(1)

    if (!schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Verify the schedule's workflow belongs to this org
    const [wf] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(and(eq(workflows.id, schedule.workflowId), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!wf) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return Response.json({ schedule })
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching schedule ${scheduleId}`, error)
    return Response.json(
      { error: error.message || 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id: scheduleId } = await params
  const requestId = crypto.randomUUID()

  try {
    const body = await req.json()
    const validation = scheduleUpdateSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: validation.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      )
    }

    // Fetch schedule and verify ownership
    const [schedule] = await db
      .select()
      .from(workflowSchedule)
      .where(eq(workflowSchedule.id, scheduleId))
      .limit(1)

    if (!schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const [wf] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(and(eq(workflows.id, schedule.workflowId), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!wf) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const { action } = validation.data

    if (action === 'disable') {
      if (schedule.status !== 'active') {
        return Response.json({ message: 'Schedule is already disabled' })
      }

      await db
        .update(workflowSchedule)
        .set({ status: 'disabled', updatedAt: new Date() })
        .where(eq(workflowSchedule.id, scheduleId))

      logger.info(`[${requestId}] Disabled schedule: ${scheduleId}`)
      return Response.json({ message: 'Schedule disabled successfully' })
    }

    if (action === 'enable') {
      if (schedule.status === 'active') {
        return Response.json({ message: 'Schedule is already enabled' })
      }

      // Validate the cron expression before enabling
      const cronResult = validateCronExpression(
        schedule.cronExpression,
        schedule.timezone || 'UTC'
      )
      if (!cronResult.isValid) {
        return Response.json(
          { error: 'Schedule has invalid cron expression' },
          { status: 400 }
        )
      }

      await db
        .update(workflowSchedule)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(workflowSchedule.id, scheduleId))

      logger.info(`[${requestId}] Enabled schedule: ${scheduleId}`)
      return Response.json({
        message: 'Schedule enabled successfully',
        nextRunAt: cronResult.nextRun,
      })
    }

    // action === 'update'
    const updates = validation.data
    const setFields: Record<string, unknown> = { updatedAt: new Date() }

    if (updates.timezone !== undefined) {
      setFields.timezone = updates.timezone
    }

    if (updates.cronExpression !== undefined) {
      const tz = updates.timezone ?? schedule.timezone ?? 'UTC'
      const cronResult = validateCronExpression(updates.cronExpression, tz)
      if (!cronResult.isValid) {
        return Response.json(
          { error: cronResult.error || 'Invalid cron expression' },
          { status: 400 }
        )
      }
      setFields.cronExpression = updates.cronExpression
    }

    await db
      .update(workflowSchedule)
      .set(setFields)
      .where(eq(workflowSchedule.id, scheduleId))

    logger.info(`[${requestId}] Updated schedule: ${scheduleId}`)
    return Response.json({ message: 'Schedule updated successfully' })
  } catch (error: any) {
    logger.error(`[${requestId}] Error updating schedule ${scheduleId}`, error)
    return Response.json(
      { error: error.message || 'Failed to update schedule' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id: scheduleId } = await params
  const requestId = crypto.randomUUID()

  try {
    const [schedule] = await db
      .select()
      .from(workflowSchedule)
      .where(eq(workflowSchedule.id, scheduleId))
      .limit(1)

    if (!schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Verify the schedule's workflow belongs to this org
    const [wf] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(and(eq(workflows.id, schedule.workflowId), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!wf) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 })
    }

    await db.delete(workflowSchedule).where(eq(workflowSchedule.id, scheduleId))

    logger.info(`[${requestId}] Deleted schedule: ${scheduleId}`)
    return Response.json({ message: 'Schedule deleted successfully' })
  } catch (error: any) {
    logger.error(`[${requestId}] Error deleting schedule ${scheduleId}`, error)
    return Response.json(
      { error: error.message || 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}

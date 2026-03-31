/**
 * Schedule worker — checks for due schedules and executes workflows.
 * Follows Sim's approach: nextRunAt + lastQueuedAt for dedup, inline execution.
 *
 * Two modes:
 * 1. PgBoss polling (self-hosted): call `startScheduleWorker()` from instrumentation.ts
 * 2. Cron endpoint (serverless): call `checkAndExecuteDueSchedules()` from /api/cron/schedules
 */
import { Cron } from 'croner'
import { and, eq, isNull, lt, lte, ne, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  workflowSchedule,
  workflows,
  workflowBlocks,
  workflowEdges,
  workflowExecutionLogs,
} from '@/lib/db/schema'
import { createLogger } from '@/lib/sim/logger'
import { apiBlockToBlockState } from '@/apps/automations/stores/workflows/utils'
import type { BlockState as SerializerBlockState } from '@/apps/automations/stores/workflow-types'
import { Serializer } from '@/lib/sim/serializer'
import { Executor } from '@/lib/sim/executor'
import { getEffectiveEnvVars } from '@/lib/environment/utils.server'
import type { Edge } from 'reactflow'

const logger = createLogger('ScheduleWorker')

const MAX_CONSECUTIVE_FAILURES = 5

/**
 * Find all schedules that are due for execution.
 * Uses Sim's dedup pattern: nextRunAt <= now AND (lastQueuedAt IS NULL OR lastQueuedAt < nextRunAt)
 */
async function findDueSchedules() {
  const now = new Date()

  return db
    .select({
      schedule: workflowSchedule,
    })
    .from(workflowSchedule)
    .innerJoin(workflows, eq(workflowSchedule.workflowId, workflows.id))
    .where(
      and(
        isNull(workflowSchedule.archivedAt),
        lte(workflowSchedule.nextRunAt, now),
        ne(workflowSchedule.status, 'disabled'),
        ne(workflowSchedule.status, 'completed'),
        eq(workflows.isDeployed, true),
        or(
          isNull(workflowSchedule.lastQueuedAt),
          lt(workflowSchedule.lastQueuedAt, workflowSchedule.nextRunAt)
        )
      )
    )
}

/**
 * Atomically lock a schedule by setting lastQueuedAt.
 * Returns true if the lock was acquired (no other process grabbed it).
 */
async function lockSchedule(scheduleId: string): Promise<boolean> {
  const now = new Date()
  const result = await db
    .update(workflowSchedule)
    .set({
      lastQueuedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(workflowSchedule.id, scheduleId),
        or(
          isNull(workflowSchedule.lastQueuedAt),
          lt(workflowSchedule.lastQueuedAt, workflowSchedule.nextRunAt)
        )
      )
    )
    .returning({ id: workflowSchedule.id })

  return result.length > 0
}

/**
 * Calculate the next run time for a cron expression.
 */
function calculateNextRunAt(cronExpression: string, timezone: string): Date | null {
  try {
    const cron = new Cron(cronExpression, { timezone })
    return cron.nextRun() ?? null
  } catch {
    return null
  }
}

/**
 * Execute a single scheduled workflow. Shared between PgBoss and cron endpoint.
 */
export async function executeScheduleForWorkflow(params: {
  scheduleId: string
  workflowId: string
  blockId: string
  cronExpression: string
  timezone: string
}): Promise<{ success: boolean; error?: string }> {
  const { scheduleId, workflowId, blockId, cronExpression, timezone } = params
  const requestId = crypto.randomUUID()

  try {
    // Load workflow
    const [wf] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId as any), eq(workflows.isDeployed, true)))
      .limit(1)

    if (!wf) {
      logger.warn(
        `[${requestId}] Workflow ${workflowId} not found or not deployed, skipping schedule ${scheduleId}`
      )
      return { success: false, error: 'Workflow not found or not deployed' }
    }

    // Load blocks + edges
    const apiBlocks = await db
      .select()
      .from(workflowBlocks)
      .where(eq(workflowBlocks.workflowId, workflowId as any))

    const apiEdges = await db
      .select()
      .from(workflowEdges)
      .where(eq(workflowEdges.workflowId, workflowId as any))

    const blockStates: Record<string, SerializerBlockState> = {}
    for (const ab of apiBlocks) {
      const bs = apiBlockToBlockState(ab) as unknown as SerializerBlockState
      blockStates[bs.id] = bs
    }

    const edges: Edge[] = apiEdges.map((e) => ({
      id: e.id,
      source: e.sourceBlockId,
      target: e.targetBlockId,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    }))

    // Serialize and execute
    const serializer = new Serializer()
    const serialized = serializer.serializeWorkflow(blockStates, edges)

    const executionId = crypto.randomUUID()
    const startTime = Date.now()

    const envVarValues = wf.userId ? await getEffectiveEnvVars(wf.userId) : {}
    const executor = new Executor({
      workflow: serialized,
      envVarValues,
      workflowVariables: (wf.variables as Record<string, unknown>) ?? {},
      contextExtensions: {
        workspaceId: wf.orgId,
        userId: wf.userId ?? undefined,
      },
    })

    const result = await executor.execute(workflowId)

    const endTime = Date.now()

    // Write execution log
    await db.insert(workflowExecutionLogs).values({
      workflowId: workflowId as `${string}-${string}-${string}-${string}-${string}`,
      orgId: wf.orgId,
      executionId: executionId as `${string}-${string}-${string}-${string}-${string}`,
      status: result.success ? 'success' : 'error',
      trigger: 'scheduled',
      startedAt: new Date(startTime),
      endedAt: new Date(endTime),
      totalDurationMs: endTime - startTime,
      executionData: result.logs ?? [],
    })

    // Update workflow run count
    await db
      .update(workflows)
      .set({
        runCount: (wf.runCount ?? 0) + 1,
        lastRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId as any))

    // Update schedule: set lastRanAt, calculate nextRunAt, reset failedCount
    const nextRunAt = calculateNextRunAt(cronExpression, timezone)
    await db
      .update(workflowSchedule)
      .set({
        lastRanAt: new Date(),
        nextRunAt,
        failedCount: result.success ? 0 : sql`${workflowSchedule.failedCount} + 1`,
        lastFailedAt: result.success ? undefined : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workflowSchedule.id, scheduleId))

    // Disable schedule after too many consecutive failures
    if (!result.success) {
      const [updated] = await db
        .select({ failedCount: workflowSchedule.failedCount })
        .from(workflowSchedule)
        .where(eq(workflowSchedule.id, scheduleId))
        .limit(1)

      if (updated && updated.failedCount >= MAX_CONSECUTIVE_FAILURES) {
        await db
          .update(workflowSchedule)
          .set({ status: 'disabled', updatedAt: new Date() })
          .where(eq(workflowSchedule.id, scheduleId))
        logger.warn(
          `[${requestId}] Schedule ${scheduleId} disabled after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`
        )
      }
    }

    logger.info(
      `[${requestId}] Scheduled execution completed for workflow ${workflowId}: ${result.success ? 'success' : 'error'}`
    )

    return { success: result.success, error: result.error }
  } catch (error) {
    logger.error(`[${requestId}] Scheduled execution failed for workflow ${workflowId}`, error)

    // Update failure tracking
    await db
      .update(workflowSchedule)
      .set({
        failedCount: sql`${workflowSchedule.failedCount} + 1`,
        lastFailedAt: new Date(),
        lastRanAt: new Date(),
        nextRunAt: calculateNextRunAt(cronExpression, timezone),
        updatedAt: new Date(),
      })
      .where(eq(workflowSchedule.id, scheduleId))
      .catch(() => {}) // Don't fail the whole operation if tracking update fails

    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Check and execute all due schedules. Called by both PgBoss and cron endpoint.
 * Returns summary of executions.
 */
export async function checkAndExecuteDueSchedules(): Promise<{
  checked: number
  executed: number
  errors: number
}> {
  const dueSchedules = await findDueSchedules()
  const summary = { checked: dueSchedules.length, executed: 0, errors: 0 }

  for (const { schedule } of dueSchedules) {
    try {
      // Atomically lock to prevent duplicate execution
      const locked = await lockSchedule(schedule.id)
      if (!locked) {
        logger.info(`Schedule ${schedule.id} already locked, skipping`)
        continue
      }

      const result = await executeScheduleForWorkflow({
        scheduleId: schedule.id,
        workflowId: schedule.workflowId,
        blockId: schedule.blockId,
        cronExpression: schedule.cronExpression,
        timezone: schedule.timezone,
      })

      if (result.success) {
        summary.executed++
      } else {
        summary.errors++
      }
    } catch (error) {
      logger.error(`Error processing schedule ${schedule.id}:`, error)
      summary.errors++
    }
  }

  if (summary.checked > 0) {
    logger.info(
      `Schedule check complete: ${summary.checked} due, ${summary.executed} executed, ${summary.errors} errors`
    )
  }

  return summary
}

// ── PgBoss mode (self-hosted) ──────────────────────────────────────────────

let bossInstance: any = null
let intervalId: ReturnType<typeof setInterval> | null = null

/**
 * Start the schedule worker using PgBoss for self-hosted deployments.
 * Polls every 60 seconds for due schedules.
 */
export async function startScheduleWorker() {
  try {
    // Use a simple setInterval instead of PgBoss for the check loop
    // PgBoss is only needed if we want distributed job queuing
    intervalId = setInterval(async () => {
      try {
        await checkAndExecuteDueSchedules()
      } catch (error) {
        logger.error('Schedule check failed:', error)
      }
    }, 60_000)

    // Run once immediately
    await checkAndExecuteDueSchedules()

    logger.info('Schedule worker started — checking due schedules every 60 seconds')
  } catch (error) {
    logger.error('Failed to start schedule worker:', error)
    throw error
  }
}

/**
 * Stop the schedule worker gracefully.
 */
export async function stopScheduleWorker() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (bossInstance) {
    await bossInstance.stop()
    bossInstance = null
  }
  logger.info('Schedule worker stopped')
}

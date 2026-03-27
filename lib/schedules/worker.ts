/**
 * PgBoss schedule worker — polls for due schedules and executes workflows.
 * Replaces Sim's Trigger.dev cron infrastructure.
 *
 * Usage: Import and call `startScheduleWorker()` from your app initialization.
 * In dev mode, you can also run this file directly via `npx tsx lib/schedules/worker.ts`.
 */
import { PgBoss, type Job } from 'pg-boss'
import { Cron } from 'croner'
import { db } from '@/lib/db'
import { workflowSchedule, workflows, workflowBlocks, workflowEdges, workflowExecutionLogs } from '@/lib/db/schema'
import { createLogger } from '@/lib/sim/logger'
import { eq, and } from 'drizzle-orm'
import { apiBlockToBlockState } from '@/apps/automations/stores/workflows/utils'
import type { BlockState as SerializerBlockState } from '@/apps/automations/stores/workflow-types'
import { Serializer } from '@/lib/sim/serializer'
import { Executor } from '@/lib/sim/executor'
import { getEffectiveEnvVars } from '@/lib/environment/utils.server'
import type { Edge } from 'reactflow'

const logger = createLogger('ScheduleWorker')

const SCHEDULE_CHECK_QUEUE = 'check-due-schedules'
const SCHEDULE_EXECUTE_QUEUE = 'execute-scheduled-workflow'

let bossInstance: PgBoss | null = null

async function getBoss(): Promise<PgBoss> {
  if (bossInstance) return bossInstance

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL not set')
  }

  bossInstance = new PgBoss(connectionString)

  await bossInstance.start()
  logger.info('PgBoss started')

  return bossInstance
}

/**
 * Check all enabled schedules and queue executions for those that are due.
 */
async function checkDueSchedules() {
  const now = new Date()

  const enabledSchedules = await db
    .select()
    .from(workflowSchedule)
    .where(eq(workflowSchedule.enabled, true))

  for (const schedule of enabledSchedules) {
    try {
      const cron = new Cron(schedule.cronExpression, {
        timezone: schedule.timezone,
      })

      const nextRun = cron.nextRun()
      if (!nextRun) continue

      // Check if this schedule should have fired since the last check
      // We use a 90-second window to account for polling interval drift
      const prevRun = cron.previousRun()
      if (prevRun && prevRun > new Date(now.getTime() - 90_000)) {
        logger.info(`Schedule ${schedule.id} is due, queueing execution for workflow ${schedule.workflowId}`)

        const boss = await getBoss()
        await boss.send(SCHEDULE_EXECUTE_QUEUE, {
          scheduleId: schedule.id,
          workflowId: schedule.workflowId,
          blockId: schedule.blockId,
          cronExpression: schedule.cronExpression,
          timezone: schedule.timezone,
        })
      }
    } catch (error) {
      logger.error(`Error checking schedule ${schedule.id}:`, error)
    }
  }
}

/**
 * Execute a workflow triggered by a schedule.
 */
interface ScheduleJobData {
  scheduleId: string
  workflowId: string
  blockId: string
  cronExpression: string
  timezone: string
}

async function executeScheduledWorkflow(jobs: Job<ScheduleJobData>[]) {
  for (const job of jobs) {
    await executeOneScheduledWorkflow(job)
  }
}

async function executeOneScheduledWorkflow(job: Job<ScheduleJobData>) {
  const { workflowId, scheduleId, blockId } = job.data
  const requestId = crypto.randomUUID()

  try {
    // Load workflow
    const [wf] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId as any), eq(workflows.isDeployed, true)))
      .limit(1)

    if (!wf) {
      logger.warn(`[${requestId}] Workflow ${workflowId} not found or not deployed, skipping schedule ${scheduleId}`)
      return
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

    const envVarValues = wf.userId
      ? await getEffectiveEnvVars(wf.userId)
      : {}
    const executor = new Executor({
      workflow: serialized,
      envVarValues,
      workflowVariables: (wf.variables as Record<string, unknown>) ?? {},
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

    logger.info(
      `[${requestId}] Scheduled execution completed for workflow ${workflowId}: ${result.success ? 'success' : 'error'}`
    )
  } catch (error) {
    logger.error(`[${requestId}] Scheduled execution failed for workflow ${workflowId}`, error)
  }
}

/**
 * Start the schedule worker. Call once at app startup.
 */
export async function startScheduleWorker() {
  try {
    const boss = await getBoss()

    // Register the execution handler
    await boss.work<ScheduleJobData>(SCHEDULE_EXECUTE_QUEUE, executeScheduledWorkflow)

    // Schedule the periodic check (every 60 seconds)
    await boss.schedule(SCHEDULE_CHECK_QUEUE, '* * * * *', {}, {
      tz: 'UTC',
    })

    const checkHandler: any = async () => {
      await checkDueSchedules()
    }
    await boss.work(SCHEDULE_CHECK_QUEUE, checkHandler)

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
  if (bossInstance) {
    await bossInstance.stop()
    bossInstance = null
    logger.info('Schedule worker stopped')
  }
}

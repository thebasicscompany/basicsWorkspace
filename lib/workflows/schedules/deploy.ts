/**
 * Schedule deployment functions — copied from Sim's lib/workflows/schedules/deploy.ts
 * Simplified: no onConflictDoUpdate (our schema doesn't have composite unique),
 * no deploymentVersionId/archivedAt columns on workflowSchedule (our simplified schema).
 */
import { db } from '@/lib/db'
import { workflowSchedule } from '@/lib/db/schema'
import { createLogger } from '@/lib/sim/logger'
import { eq } from 'drizzle-orm'
import { cleanupWebhooksForWorkflow } from '@/lib/webhooks/deploy'
import type { BlockState } from '@/lib/workflows/schedules/utils'
import { findScheduleBlocks, validateScheduleBlock } from '@/lib/workflows/schedules/validation'

const logger = createLogger('ScheduleDeployUtils')

export interface ScheduleDeployResult {
  success: boolean
  error?: string
  scheduleId?: string
  cronExpression?: string
  nextRunAt?: Date
  timezone?: string
}

/**
 * Create or update schedule records for a workflow during deployment.
 */
export async function createSchedulesForDeploy(
  workflowId: string,
  blocks: Record<string, BlockState>,
  deploymentVersionId?: string
): Promise<ScheduleDeployResult> {
  const scheduleBlocks = findScheduleBlocks(blocks)

  if (scheduleBlocks.length === 0) {
    logger.info(`No schedule blocks found in workflow ${workflowId}`)
    return { success: true }
  }

  // Phase 1: Validate ALL blocks before making any DB changes
  const validatedBlocks: Array<{
    blockId: string
    cronExpression: string
    nextRunAt: Date
    timezone: string
  }> = []

  for (const block of scheduleBlocks) {
    const blockId = block.id as string
    const validation = validateScheduleBlock(block)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }
    validatedBlocks.push({
      blockId,
      cronExpression: validation.cronExpression!,
      nextRunAt: validation.nextRunAt!,
      timezone: validation.timezone!,
    })
  }

  // Phase 2: All validations passed - now do DB operations
  let lastScheduleInfo: {
    scheduleId: string
    cronExpression?: string
    nextRunAt?: Date
    timezone?: string
  } | null = null

  try {
    await db.transaction(async (tx) => {
      // Delete existing schedules for this workflow
      await tx
        .delete(workflowSchedule)
        .where(eq(workflowSchedule.workflowId, workflowId))

      for (const validated of validatedBlocks) {
        const { blockId, cronExpression, nextRunAt, timezone } = validated
        const scheduleId = crypto.randomUUID()
        const now = new Date()

        await tx.insert(workflowSchedule).values({
          id: scheduleId,
          workflowId,
          blockId,
          cronExpression,
          timezone,
          status: 'active',
          nextRunAt: nextRunAt,
          createdAt: now,
          updatedAt: now,
        })

        logger.info(`Schedule created for workflow ${workflowId}, block ${blockId}`, {
          scheduleId,
          cronExpression,
          nextRunAt: nextRunAt?.toISOString(),
        })

        lastScheduleInfo = { scheduleId, cronExpression, nextRunAt, timezone }
      }
    })
  } catch (error) {
    logger.error(`Failed to create schedules for workflow ${workflowId}`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create schedules',
    }
  }

  return {
    success: true,
    ...(lastScheduleInfo ?? {}),
  }
}

/**
 * Delete all schedules for a workflow
 */
export async function deleteSchedulesForWorkflow(workflowId: string): Promise<void> {
  await db
    .delete(workflowSchedule)
    .where(eq(workflowSchedule.workflowId, workflowId))

  logger.info(`Deleted all schedules for workflow ${workflowId}`)
}

export async function cleanupDeploymentVersion(params: {
  workflowId: string
  requestId: string
  deploymentVersionId: string
}): Promise<void> {
  const { workflowId, requestId, deploymentVersionId } = params
  await cleanupWebhooksForWorkflow(workflowId, requestId, deploymentVersionId)
  await deleteSchedulesForWorkflow(workflowId)
}

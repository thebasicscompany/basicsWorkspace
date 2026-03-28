/**
 * Workflow lifecycle management — archive and restore.
 * Adapted from Sim's lib/workflows/lifecycle.ts
 *
 * Simplifications:
 * - No Redis cache clearing (A2A agent cards)
 * - No socket server notifications
 * - No MCP pubsub
 * - No telemetry events
 * - No external webhook cleanup (stubbed)
 * - No workspace permission checks (uses org-scoped auth in routes)
 */
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  webhook,
  workflows,
  workflowDeploymentVersion,
  workflowSchedule,
} from '@/lib/db/schema'
import { createLogger } from '@/lib/sim/logger'

const logger = createLogger('WorkflowLifecycle')

interface ArchiveWorkflowOptions {
  requestId: string
}

export async function archiveWorkflow(
  workflowId: string,
  options: ArchiveWorkflowOptions
): Promise<{ archived: boolean }> {
  const [existing] = await db
    .select({ id: workflows.id, archivedAt: workflows.archivedAt })
    .from(workflows)
    .where(eq(workflows.id, workflowId as any))
    .limit(1)

  if (!existing) {
    return { archived: false }
  }

  if (existing.archivedAt) {
    return { archived: false }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    // Disable schedules
    await tx
      .update(workflowSchedule)
      .set({ enabled: false, updatedAt: now })
      .where(eq(workflowSchedule.workflowId, workflowId))

    // Deactivate webhooks
    await tx
      .update(webhook)
      .set({ isActive: false, updatedAt: now })
      .where(eq(webhook.workflowId, workflowId))

    // Deactivate deployment versions
    await tx
      .update(workflowDeploymentVersion)
      .set({ isActive: false })
      .where(eq(workflowDeploymentVersion.workflowId, workflowId))

    // Archive the workflow
    await tx
      .update(workflows)
      .set({
        archivedAt: now,
        updatedAt: now,
        isDeployed: false,
      })
      .where(eq(workflows.id, workflowId as any))
  })

  logger.info(`[${options.requestId}] Archived workflow ${workflowId}`)

  return { archived: true }
}

export async function restoreWorkflow(
  workflowId: string,
  options: { requestId: string }
): Promise<{ restored: boolean }> {
  const [existing] = await db
    .select({ id: workflows.id, archivedAt: workflows.archivedAt })
    .from(workflows)
    .where(eq(workflows.id, workflowId as any))
    .limit(1)

  if (!existing || !existing.archivedAt) {
    return { restored: false }
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(workflows)
      .set({ archivedAt: null, updatedAt: now })
      .where(eq(workflows.id, workflowId as any))

    await tx
      .update(workflowSchedule)
      .set({ updatedAt: now })
      .where(eq(workflowSchedule.workflowId, workflowId))

    await tx
      .update(webhook)
      .set({ updatedAt: now })
      .where(eq(webhook.workflowId, workflowId))
  })

  logger.info(`[${options.requestId}] Restored workflow ${workflowId}`)

  return { restored: true }
}

export async function archiveWorkflows(
  workflowIds: string[],
  options: ArchiveWorkflowOptions
): Promise<number> {
  let archivedCount = 0

  for (const workflowId of Array.from(new Set(workflowIds))) {
    const result = await archiveWorkflow(workflowId, options)
    if (result.archived) {
      archivedCount += 1
    }
  }

  return archivedCount
}

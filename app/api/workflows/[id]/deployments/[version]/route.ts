/**
 * Get or update a specific deployment version.
 * Adapted from Sim's app/api/workflows/[id]/deployments/[version]/route.ts
 *
 * GET  — returns the deployed state for a specific version
 * PATCH — updates name/description, or activates a version (isActive: true)
 */
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { workflowDeploymentVersion, workflows } from '@/lib/db/schema'
import { requireOrg } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/sim/logger'
import { saveTriggerWebhooksForDeploy } from '@/lib/webhooks/deploy'
import { activateWorkflowVersion } from '@/lib/workflows/persistence/utils'
import {
  createSchedulesForDeploy,
  cleanupDeploymentVersion,
} from '@/lib/workflows/schedules/deploy'
import { validateWorkflowSchedules } from '@/lib/workflows/schedules/validation'
import type { BlockState } from '@/apps/automations/stores/workflow-types'

const logger = createLogger('WorkflowDeploymentVersionAPI')

const patchBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name must be 100 characters or less')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'Description must be 2000 characters or less')
      .nullable()
      .optional(),
    isActive: z.literal(true).optional(), // Set to true to activate this version
  })
  .refine(
    (data) => data.name !== undefined || data.description !== undefined || data.isActive === true,
    {
      message: 'At least one of name, description, or isActive must be provided',
    }
  )

type Params = Promise<{ id: string; version: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id, version } = await params
  const requestId = crypto.randomUUID()

  try {
    // Verify workflow belongs to this org
    const [workflowData] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(and(eq(workflows.id, id as any), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!workflowData) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const versionNum = Number(version)
    if (!Number.isFinite(versionNum)) {
      return Response.json({ error: 'Invalid version' }, { status: 400 })
    }

    const [row] = await db
      .select({ state: workflowDeploymentVersion.state })
      .from(workflowDeploymentVersion)
      .where(
        and(
          eq(workflowDeploymentVersion.workflowId, id),
          eq(workflowDeploymentVersion.version, versionNum)
        )
      )
      .limit(1)

    if (!row?.state) {
      return Response.json({ error: 'Deployment version not found' }, { status: 404 })
    }

    return Response.json({ deployedState: row.state })
  } catch (error: any) {
    logger.error(
      `[${requestId}] Error fetching deployment version ${version} for workflow ${id}`,
      error
    )
    return Response.json(
      { error: error.message || 'Failed to fetch deployment version' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { id, version } = await params
  const requestId = crypto.randomUUID()

  try {
    const body = await req.json()
    const validation = patchBodySchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: validation.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      )
    }

    const { name, description, isActive } = validation.data

    // Verify workflow belongs to this org
    const [workflowData] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id as any), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!workflowData) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const versionNum = Number(version)
    if (!Number.isFinite(versionNum)) {
      return Response.json({ error: 'Invalid version' }, { status: 400 })
    }

    // Handle activation
    if (isActive) {
      const [versionRow] = await db
        .select({
          id: workflowDeploymentVersion.id,
          state: workflowDeploymentVersion.state,
        })
        .from(workflowDeploymentVersion)
        .where(
          and(
            eq(workflowDeploymentVersion.workflowId, id),
            eq(workflowDeploymentVersion.version, versionNum)
          )
        )
        .limit(1)

      if (!versionRow?.state) {
        return Response.json({ error: 'Deployment version not found' }, { status: 404 })
      }

      // Get current active version for cleanup
      const [currentActiveVersion] = await db
        .select({ id: workflowDeploymentVersion.id })
        .from(workflowDeploymentVersion)
        .where(
          and(
            eq(workflowDeploymentVersion.workflowId, id),
            eq(workflowDeploymentVersion.isActive, true)
          )
        )
        .limit(1)

      const previousVersionId = currentActiveVersion?.id

      const deployedState = versionRow.state as { blocks?: Record<string, BlockState> }
      const blocks = deployedState.blocks
      if (!blocks || typeof blocks !== 'object') {
        return Response.json({ error: 'Invalid deployed state structure' }, { status: 500 })
      }

      const scheduleValidation = validateWorkflowSchedules(blocks)
      if (!scheduleValidation.isValid) {
        return Response.json(
          { error: `Invalid schedule configuration: ${scheduleValidation.error}` },
          { status: 400 }
        )
      }

      const triggerSaveResult = await saveTriggerWebhooksForDeploy({
        workflowId: id,
        blocks,
        requestId,
        deploymentVersionId: versionRow.id,
        previousVersionId,
      })

      if (!triggerSaveResult.success) {
        return Response.json(
          { error: triggerSaveResult.error?.message || 'Failed to sync trigger configuration' },
          { status: triggerSaveResult.error?.status || 500 }
        )
      }

      const scheduleResult = await createSchedulesForDeploy(id, blocks, versionRow.id)

      if (!scheduleResult.success) {
        await cleanupDeploymentVersion({
          workflowId: id,
          requestId,
          deploymentVersionId: versionRow.id,
        })
        return Response.json(
          { error: scheduleResult.error || 'Failed to sync schedules' },
          { status: 500 }
        )
      }

      const result = await activateWorkflowVersion({ workflowId: id, version: versionNum })
      if (!result.success) {
        await cleanupDeploymentVersion({
          workflowId: id,
          requestId,
          deploymentVersionId: versionRow.id,
        })
        return Response.json(
          { error: result.error || 'Failed to activate deployment' },
          { status: 400 }
        )
      }

      // Clean up previous version's webhooks/schedules if different
      if (previousVersionId && previousVersionId !== versionRow.id) {
        try {
          logger.info(
            `[${requestId}] Cleaning up previous version ${previousVersionId} webhooks/schedules`
          )
          await cleanupDeploymentVersion({
            workflowId: id,
            requestId,
            deploymentVersionId: previousVersionId,
          })
          logger.info(`[${requestId}] Previous version cleanup completed`)
        } catch (cleanupError) {
          logger.error(
            `[${requestId}] Failed to clean up previous version ${previousVersionId}`,
            cleanupError
          )
        }
      }

      // Apply name/description updates if provided alongside activation
      let updatedName: string | null | undefined
      let updatedDescription: string | null | undefined
      if (name !== undefined || description !== undefined) {
        const activationUpdateData: { name?: string; description?: string | null } = {}
        if (name !== undefined) {
          activationUpdateData.name = name
        }
        if (description !== undefined) {
          activationUpdateData.description = description
        }

        const [updated] = await db
          .update(workflowDeploymentVersion)
          .set(activationUpdateData)
          .where(
            and(
              eq(workflowDeploymentVersion.workflowId, id),
              eq(workflowDeploymentVersion.version, versionNum)
            )
          )
          .returning({
            name: workflowDeploymentVersion.name,
            description: workflowDeploymentVersion.description,
          })

        if (updated) {
          updatedName = updated.name
          updatedDescription = updated.description
        }
      }

      return Response.json({
        success: true,
        deployedAt: result.deployedAt,
        warnings: triggerSaveResult.warnings,
        ...(updatedName !== undefined && { name: updatedName }),
        ...(updatedDescription !== undefined && { description: updatedDescription }),
      })
    }

    // Handle name/description updates only (no activation)
    const updateData: { name?: string; description?: string | null } = {}
    if (name !== undefined) {
      updateData.name = name
    }
    if (description !== undefined) {
      updateData.description = description
    }

    const [updated] = await db
      .update(workflowDeploymentVersion)
      .set(updateData)
      .where(
        and(
          eq(workflowDeploymentVersion.workflowId, id),
          eq(workflowDeploymentVersion.version, versionNum)
        )
      )
      .returning({
        id: workflowDeploymentVersion.id,
        name: workflowDeploymentVersion.name,
        description: workflowDeploymentVersion.description,
      })

    if (!updated) {
      return Response.json({ error: 'Deployment version not found' }, { status: 404 })
    }

    logger.info(`[${requestId}] Updated deployment version ${version} for workflow ${id}`, {
      name: updateData.name,
      description: updateData.description,
    })

    return Response.json({ name: updated.name, description: updated.description })
  } catch (error: any) {
    logger.error(
      `[${requestId}] Error updating deployment version ${version} for workflow ${id}`,
      error
    )
    return Response.json(
      { error: error.message || 'Failed to update deployment version' },
      { status: 500 }
    )
  }
}

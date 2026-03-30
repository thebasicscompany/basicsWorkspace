/**
 * Workflow deploy/undeploy API route — adapted from Sim's app/api/workflows/[id]/deploy/route.ts
 * Simplified: no audit logging, no MCP sync, no public API toggle, no version rollback.
 */
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workflows, workflowDeploymentVersion } from '@/lib/db/schema'
import { requireOrg } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/sim/logger'
import {
  cleanupWebhooksForWorkflow,
  saveTriggerWebhooksForDeploy,
} from '@/lib/webhooks/deploy'
import {
  deployWorkflow,
  loadWorkflowFromNormalizedTables,
  undeployWorkflow,
} from '@/lib/workflows/persistence/utils'
import {
  createSchedulesForDeploy,
  cleanupDeploymentVersion,
} from '@/lib/workflows/schedules/deploy'
import { validateWorkflowSchedules } from '@/lib/workflows/schedules/validation'

/**
 * Build a stable, deterministic JSON string from workflow state for comparison.
 * Deep-sorts all object keys so field ordering differences don't cause false positives.
 * Strips volatile fields (timestamps, lastSaved).
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).filter(k => k !== 'lastSaved').sort()
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

function buildStateFingerprint(state: Record<string, unknown>): string {
  const { lastSaved, ...rest } = state
  return stableStringify(rest)
}

async function computeNeedsRedeployment(workflowId: string): Promise<boolean> {
  try {
    // Load current workflow state from normalized tables
    const currentData = await loadWorkflowFromNormalizedTables(workflowId)
    if (!currentData) return false

    // Load the active deployment version's state snapshot
    const [activeVersion] = await db
      .select({ state: workflowDeploymentVersion.state })
      .from(workflowDeploymentVersion)
      .where(
        and(
          eq(workflowDeploymentVersion.workflowId, workflowId),
          eq(workflowDeploymentVersion.isActive, true)
        )
      )
      .orderBy(desc(workflowDeploymentVersion.createdAt))
      .limit(1)

    if (!activeVersion?.state) return false

    const deployedState = activeVersion.state as Record<string, unknown>

    // Build comparable representations
    const currentComparable = buildStateFingerprint({
      blocks: currentData.blocks,
      edges: currentData.edges,
      loops: currentData.loops,
      parallels: currentData.parallels,
    })

    const deployedComparable = buildStateFingerprint({
      blocks: deployedState.blocks,
      edges: deployedState.edges,
      loops: (deployedState as any).loops || {},
      parallels: (deployedState as any).parallels || {},
    })

    return currentComparable !== deployedComparable
  } catch {
    return false
  }
}

const logger = createLogger('WorkflowDeployAPI')

type Params = Promise<{ id: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id } = await params
  const requestId = crypto.randomUUID()

  try {
    const [workflowData] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id as any), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!workflowData) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (!workflowData.isDeployed) {
      logger.info(`[${requestId}] Workflow is not deployed: ${id}`)
      return Response.json({
        isDeployed: false,
        deployedAt: null,
        needsRedeployment: false,
      })
    }

    const needsRedeployment = await computeNeedsRedeployment(id)

    logger.info(`[${requestId}] Deployment info for ${id}: needsRedeployment=${needsRedeployment}`)

    return Response.json({
      isDeployed: workflowData.isDeployed,
      deployedAt: workflowData.deployedAt,
      needsRedeployment,
    })
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching deployment info: ${id}`, error)
    return Response.json(
      { error: error.message || 'Failed to fetch deployment information' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { id } = await params
  const requestId = crypto.randomUUID()

  try {
    const [workflowData] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id as any), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!workflowData) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const normalizedData = await loadWorkflowFromNormalizedTables(id)
    if (!normalizedData) {
      return Response.json({ error: 'Failed to load workflow state' }, { status: 500 })
    }

    const scheduleValidation = validateWorkflowSchedules(normalizedData.blocks)
    if (!scheduleValidation.isValid) {
      logger.warn(
        `[${requestId}] Schedule validation failed for workflow ${id}: ${scheduleValidation.error}`
      )
      return Response.json(
        { error: `Invalid schedule configuration: ${scheduleValidation.error}` },
        { status: 400 }
      )
    }

    // Get current active version ID for cleanup
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

    const deployResult = await deployWorkflow({
      workflowId: id,
      deployedBy: userId,
      workflowName: workflowData.name,
    })

    if (!deployResult.success) {
      return Response.json(
        { error: deployResult.error || 'Failed to deploy workflow' },
        { status: 500 }
      )
    }

    const deployedAt = deployResult.deployedAt!
    const deploymentVersionId = deployResult.deploymentVersionId

    if (!deploymentVersionId) {
      await undeployWorkflow({ workflowId: id })
      return Response.json({ error: 'Failed to resolve deployment version' }, { status: 500 })
    }

    // Save trigger webhooks
    const triggerSaveResult = await saveTriggerWebhooksForDeploy({
      workflowId: id,
      blocks: normalizedData.blocks,
      requestId,
      deploymentVersionId,
      previousVersionId,
    })

    if (!triggerSaveResult.success) {
      await cleanupDeploymentVersion({
        workflowId: id,
        requestId,
        deploymentVersionId,
      })
      await undeployWorkflow({ workflowId: id })
      return Response.json(
        { error: triggerSaveResult.error?.message || 'Failed to save trigger configuration' },
        { status: triggerSaveResult.error?.status || 500 }
      )
    }

    // Create schedules
    let scheduleInfo: { scheduleId?: string; cronExpression?: string; nextRunAt?: Date } = {}
    const scheduleResult = await createSchedulesForDeploy(
      id,
      normalizedData.blocks,
      deploymentVersionId
    )
    if (!scheduleResult.success) {
      logger.error(
        `[${requestId}] Failed to create schedule for workflow ${id}: ${scheduleResult.error}`
      )
      await cleanupDeploymentVersion({
        workflowId: id,
        requestId,
        deploymentVersionId,
      })
      await undeployWorkflow({ workflowId: id })
      return Response.json(
        { error: scheduleResult.error || 'Failed to create schedule' },
        { status: 500 }
      )
    }
    if (scheduleResult.scheduleId) {
      scheduleInfo = {
        scheduleId: scheduleResult.scheduleId,
        cronExpression: scheduleResult.cronExpression,
        nextRunAt: scheduleResult.nextRunAt,
      }
      logger.info(
        `[${requestId}] Schedule created for workflow ${id}: ${scheduleResult.scheduleId}`
      )
    }

    logger.info(`[${requestId}] Workflow deployed successfully: ${id}`)

    return Response.json({
      isDeployed: true,
      deployedAt,
      schedule: scheduleInfo.scheduleId
        ? {
            id: scheduleInfo.scheduleId,
            cronExpression: scheduleInfo.cronExpression,
            nextRunAt: scheduleInfo.nextRunAt,
          }
        : undefined,
      warnings: triggerSaveResult.warnings,
    })
  } catch (error: any) {
    logger.error(`[${requestId}] Error deploying workflow: ${id}`, {
      error: error.message,
      stack: error.stack,
    })
    return Response.json(
      { error: error.message || 'Failed to deploy workflow' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id } = await params
  const requestId = crypto.randomUUID()

  try {
    const [workflowData] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id as any), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!workflowData) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const result = await undeployWorkflow({ workflowId: id })
    if (!result.success) {
      return Response.json(
        { error: result.error || 'Failed to undeploy workflow' },
        { status: 500 }
      )
    }

    await cleanupWebhooksForWorkflow(id, requestId)

    logger.info(`[${requestId}] Workflow undeployed successfully: ${id}`)

    return Response.json({
      isDeployed: false,
      deployedAt: null,
    })
  } catch (error: any) {
    logger.error(`[${requestId}] Error undeploying workflow: ${id}`, error)
    return Response.json(
      { error: error.message || 'Failed to undeploy workflow' },
      { status: 500 }
    )
  }
}

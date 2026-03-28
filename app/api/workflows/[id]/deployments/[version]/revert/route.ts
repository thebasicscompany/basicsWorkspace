/**
 * Revert a workflow's working state to a specific deployment version.
 * Adapted from Sim's app/api/workflows/[id]/deployments/[version]/revert/route.ts
 *
 * Supports version number or "active" to revert to the currently active deployment.
 */
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workflowDeploymentVersion, workflows } from '@/lib/db/schema'
import { requireOrg } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/sim/logger'
import { saveWorkflowToNormalizedTables } from '@/lib/workflows/persistence/utils'
import type { WorkflowState } from '@/apps/automations/stores/workflow-types'

const logger = createLogger('RevertToDeploymentVersionAPI')

type Params = Promise<{ id: string; version: string }>

export async function POST(req: Request, { params }: { params: Params }) {
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

    const versionSelector = version === 'active' ? null : Number(version)
    if (version !== 'active' && !Number.isFinite(versionSelector)) {
      return Response.json({ error: 'Invalid version' }, { status: 400 })
    }

    let stateRow: { state: any } | null = null
    if (version === 'active') {
      const [row] = await db
        .select({ state: workflowDeploymentVersion.state })
        .from(workflowDeploymentVersion)
        .where(
          and(
            eq(workflowDeploymentVersion.workflowId, id),
            eq(workflowDeploymentVersion.isActive, true)
          )
        )
        .limit(1)
      stateRow = row || null
    } else {
      const [row] = await db
        .select({ state: workflowDeploymentVersion.state })
        .from(workflowDeploymentVersion)
        .where(
          and(
            eq(workflowDeploymentVersion.workflowId, id),
            eq(workflowDeploymentVersion.version, versionSelector as number)
          )
        )
        .limit(1)
      stateRow = row || null
    }

    if (!stateRow?.state) {
      return Response.json({ error: 'Deployment version not found' }, { status: 404 })
    }

    const deployedState = stateRow.state
    if (!deployedState.blocks || !deployedState.edges) {
      return Response.json({ error: 'Invalid deployed state structure' }, { status: 500 })
    }

    const saveResult = await saveWorkflowToNormalizedTables(id, {
      blocks: deployedState.blocks,
      edges: deployedState.edges,
      loops: deployedState.loops || {},
      parallels: deployedState.parallels || {},
      lastSaved: Date.now(),
      deploymentStatuses: deployedState.deploymentStatuses || {},
    } as unknown as WorkflowState)

    if (!saveResult.success) {
      return Response.json(
        { error: saveResult.error || 'Failed to save deployed state' },
        { status: 500 }
      )
    }

    await db
      .update(workflows)
      .set({ updatedAt: new Date() })
      .where(eq(workflows.id, id))

    return Response.json({
      message: 'Reverted to deployment version',
      lastSaved: Date.now(),
    })
  } catch (error: any) {
    logger.error(`[${requestId}] Error reverting to deployment version ${version}`, error)
    return Response.json(
      { error: error.message || 'Failed to revert' },
      { status: 500 }
    )
  }
}

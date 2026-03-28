/**
 * List deployment versions for a workflow.
 * Adapted from Sim's app/api/workflows/[id]/deployments/route.ts
 */
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user, workflowDeploymentVersion, workflows } from '@/lib/db/schema'
import { requireOrg } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/sim/logger'

const logger = createLogger('WorkflowDeploymentsListAPI')

type Params = Promise<{ id: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id } = await params
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

    const rawVersions = await db
      .select({
        id: workflowDeploymentVersion.id,
        version: workflowDeploymentVersion.version,
        name: workflowDeploymentVersion.name,
        description: workflowDeploymentVersion.description,
        isActive: workflowDeploymentVersion.isActive,
        createdAt: workflowDeploymentVersion.createdAt,
        createdBy: workflowDeploymentVersion.createdBy,
        deployedBy: user.name,
      })
      .from(workflowDeploymentVersion)
      .leftJoin(user, eq(workflowDeploymentVersion.createdBy, user.id))
      .where(eq(workflowDeploymentVersion.workflowId, id))
      .orderBy(desc(workflowDeploymentVersion.version))

    const versions = rawVersions.map((v) => ({
      ...v,
      deployedBy: v.deployedBy ?? (v.createdBy === 'admin-api' ? 'Admin' : null),
    }))

    return Response.json({ versions })
  } catch (error: any) {
    logger.error(`[${requestId}] Error listing deployments for workflow: ${id}`, error)
    return Response.json(
      { error: error.message || 'Failed to list deployments' },
      { status: 500 }
    )
  }
}

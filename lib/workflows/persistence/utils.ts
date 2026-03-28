import {
  workflows,
  workflowBlocks,
  workflowDeploymentVersion,
  workflowEdges,
  workflowSubflows,
} from '@/lib/db/schema'
import { db } from '@/lib/db'
import { createLogger } from '@/lib/sim/logger'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { and, desc, eq, sql } from 'drizzle-orm'
import type { Edge } from 'reactflow'
import { v4 as uuidv4 } from 'uuid'
import type { BlockState, Loop, Parallel, WorkflowState } from '@/apps/automations/stores/workflow-types'
import { SUBFLOW_TYPES } from '@/apps/automations/stores/workflow-types'
import { generateLoopBlocks, generateParallelBlocks } from '@/apps/automations/stores/workflows/workflow/utils'

const logger = createLogger('WorkflowDBHelpers')

export type WorkflowDeploymentVersion = InferSelectModel<typeof workflowDeploymentVersion>
type SubflowInsert = InferInsertModel<typeof workflowSubflows>

export interface WorkflowDeploymentVersionResponse {
  id: string
  version: number
  name?: string | null
  description?: string | null
  isActive: boolean
  createdAt: string
  createdBy?: string | null
  deployedBy?: string | null
}

export interface NormalizedWorkflowData {
  blocks: Record<string, BlockState>
  edges: Edge[]
  loops: Record<string, Loop>
  parallels: Record<string, Parallel>
  isFromNormalizedTables: boolean
}

export interface DeployedWorkflowData extends NormalizedWorkflowData {
  deploymentVersionId: string
  variables?: Record<string, unknown>
}

export async function blockExistsInDeployment(
  workflowId: string,
  blockId: string
): Promise<boolean> {
  try {
    const [result] = await db
      .select({ state: workflowDeploymentVersion.state })
      .from(workflowDeploymentVersion)
      .where(
        and(
          eq(workflowDeploymentVersion.workflowId, workflowId),
          eq(workflowDeploymentVersion.isActive, true)
        )
      )
      .limit(1)

    if (!result?.state) {
      return false
    }

    const state = result.state as unknown as WorkflowState
    return !!state.blocks?.[blockId]
  } catch (error) {
    logger.error(`Error checking block ${blockId} in deployment for workflow ${workflowId}:`, error)
    return false
  }
}

export async function loadDeployedWorkflowState(
  workflowId: string
): Promise<DeployedWorkflowData> {
  try {
    const [active] = await db
      .select({
        id: workflowDeploymentVersion.id,
        state: workflowDeploymentVersion.state,
        createdAt: workflowDeploymentVersion.createdAt,
      })
      .from(workflowDeploymentVersion)
      .where(
        and(
          eq(workflowDeploymentVersion.workflowId, workflowId),
          eq(workflowDeploymentVersion.isActive, true)
        )
      )
      .orderBy(desc(workflowDeploymentVersion.createdAt))
      .limit(1)

    if (!active?.state) {
      throw new Error(`Workflow ${workflowId} has no active deployment`)
    }

    const state = active.state as unknown as WorkflowState & { variables?: Record<string, unknown> }

    return {
      blocks: state.blocks || {},
      edges: state.edges || [],
      loops: state.loops || {},
      parallels: state.parallels || {},
      variables: state.variables || {},
      isFromNormalizedTables: false,
      deploymentVersionId: active.id,
    }
  } catch (error) {
    logger.error(`Error loading deployed workflow state ${workflowId}:`, error)
    throw error
  }
}

/**
 * Load workflow state from normalized tables
 * Returns null if no data found (fallback to JSON blob)
 */
export async function loadWorkflowFromNormalizedTables(
  workflowId: string
): Promise<NormalizedWorkflowData | null> {
  try {
    const [blocks, edges, subflows] = await Promise.all([
      db.select().from(workflowBlocks).where(eq(workflowBlocks.workflowId, workflowId)),
      db.select().from(workflowEdges).where(eq(workflowEdges.workflowId, workflowId)),
      db.select().from(workflowSubflows).where(eq(workflowSubflows.workflowId, workflowId)),
    ])

    // If no blocks found, assume this workflow hasn't been migrated yet
    if (blocks.length === 0) {
      return null
    }

    // Convert blocks to the expected format
    const blocksMap: Record<string, BlockState> = {}
    blocks.forEach((block) => {
      const blockData = block.data || {}

      const assembled: BlockState = {
        id: block.id,
        type: block.type,
        name: block.name,
        position: {
          x: Number(block.positionX),
          y: Number(block.positionY),
        },
        enabled: block.enabled ?? true,
        horizontalHandles: block.horizontalHandles ?? true,
        advancedMode: block.advancedMode ?? false,
        triggerMode: block.triggerMode ?? false,
        height: Number(block.height || 0),
        subBlocks: (block.subBlocks as BlockState['subBlocks']) || {},
        outputs: (block.outputs as BlockState['outputs']) || {},
        data: blockData,
        locked: block.locked ?? false,
      }

      blocksMap[block.id] = assembled
    })

    // Convert edges to the expected format
    const edgesArray: Edge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceBlockId,
      target: edge.targetBlockId,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
      type: 'default',
      data: {},
    }))

    // Convert subflows to loops and parallels
    const loops: Record<string, Loop> = {}
    const parallels: Record<string, Parallel> = {}

    subflows.forEach((subflow) => {
      const config = (subflow.config ?? {}) as Partial<Loop & Parallel>

      if (subflow.type === SUBFLOW_TYPES.LOOP) {
        const loopType =
          (config as Loop).loopType === 'for' ||
          (config as Loop).loopType === 'forEach' ||
          (config as Loop).loopType === 'while' ||
          (config as Loop).loopType === 'doWhile'
            ? (config as Loop).loopType
            : 'for'

        const loop: Loop = {
          id: subflow.id,
          nodes: Array.isArray((config as Loop).nodes) ? (config as Loop).nodes : [],
          iterations:
            typeof (config as Loop).iterations === 'number' ? (config as Loop).iterations : 1,
          loopType,
          forEachItems: (config as Loop).forEachItems ?? '',
          whileCondition: (config as Loop).whileCondition ?? '',
          doWhileCondition: (config as Loop).doWhileCondition ?? '',
          enabled: blocksMap[subflow.id]?.enabled ?? true,
        }
        loops[subflow.id] = loop

        if (blocksMap[subflow.id]) {
          const block = blocksMap[subflow.id]
          blocksMap[subflow.id] = {
            ...block,
            data: {
              ...block.data,
              collection: loop.forEachItems ?? block.data?.collection ?? '',
              whileCondition: loop.whileCondition ?? block.data?.whileCondition ?? '',
              doWhileCondition: loop.doWhileCondition ?? block.data?.doWhileCondition ?? '',
            },
          }
        }
      } else if (subflow.type === SUBFLOW_TYPES.PARALLEL) {
        const parallel: Parallel = {
          id: subflow.id,
          nodes: Array.isArray((config as Parallel).nodes) ? (config as Parallel).nodes : [],
          count: typeof (config as Parallel).count === 'number' ? (config as Parallel).count : 5,
          distribution: (config as Parallel).distribution ?? '',
          parallelType:
            (config as Parallel).parallelType === 'count' ||
            (config as Parallel).parallelType === 'collection'
              ? (config as Parallel).parallelType
              : 'count',
          enabled: blocksMap[subflow.id]?.enabled ?? true,
        }
        parallels[subflow.id] = parallel
      } else {
        logger.warn(`Unknown subflow type: ${subflow.type} for subflow ${subflow.id}`)
      }
    })

    return {
      blocks: blocksMap,
      edges: edgesArray,
      loops,
      parallels,
      isFromNormalizedTables: true,
    }
  } catch (error) {
    logger.error(`Error loading workflow ${workflowId} from normalized tables:`, error)
    return null
  }
}

/**
 * Deploy a workflow by creating a new deployment version
 */
export async function deployWorkflow(params: {
  workflowId: string
  deployedBy: string
  workflowName?: string
}): Promise<{
  success: boolean
  version?: number
  deploymentVersionId?: string
  deployedAt?: Date
  currentState?: any
  error?: string
}> {
  const { workflowId, deployedBy, workflowName } = params

  try {
    const normalizedData = await loadWorkflowFromNormalizedTables(workflowId)
    if (!normalizedData) {
      return { success: false, error: 'Failed to load workflow state' }
    }

    // Also fetch workflow variables
    const [workflowRecord] = await db
      .select({ variables: workflows.variables })
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1)

    const currentState = {
      blocks: normalizedData.blocks,
      edges: normalizedData.edges,
      loops: normalizedData.loops,
      parallels: normalizedData.parallels,
      variables: workflowRecord?.variables || undefined,
      lastSaved: Date.now(),
    }

    const now = new Date()

    const deployedVersion = await db.transaction(async (tx) => {
      // Get next version number
      const [{ maxVersion }] = await tx
        .select({ maxVersion: sql`COALESCE(MAX("version"), 0)` })
        .from(workflowDeploymentVersion)
        .where(eq(workflowDeploymentVersion.workflowId, workflowId))

      const nextVersion = Number(maxVersion) + 1
      const deploymentVersionId = uuidv4()

      // Deactivate all existing versions
      await tx
        .update(workflowDeploymentVersion)
        .set({ isActive: false })
        .where(eq(workflowDeploymentVersion.workflowId, workflowId))

      // Create new deployment version
      await tx.insert(workflowDeploymentVersion).values({
        id: deploymentVersionId,
        workflowId,
        version: nextVersion,
        state: currentState,
        isActive: true,
        createdBy: deployedBy,
        createdAt: now,
      })

      // Update workflow to deployed
      await tx
        .update(workflows)
        .set({ isDeployed: true, deployedAt: now })
        .where(eq(workflows.id, workflowId))

      return { version: nextVersion, deploymentVersionId }
    })

    logger.info(`Deployed workflow ${workflowId} as v${deployedVersion.version}`)

    return {
      success: true,
      version: deployedVersion.version,
      deploymentVersionId: deployedVersion.deploymentVersionId,
      deployedAt: now,
      currentState,
    }
  } catch (error) {
    logger.error(`Error deploying workflow ${workflowId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Undeploy a workflow by deactivating all versions and clearing deployment state.
 */
export async function undeployWorkflow(params: { workflowId: string }): Promise<{
  success: boolean
  error?: string
}> {
  const { workflowId } = params

  try {
    await db.transaction(async (tx) => {
      // Delete schedules for this workflow
      const { workflowSchedule } = await import('@/lib/db/schema')
      await tx
        .delete(workflowSchedule)
        .where(eq(workflowSchedule.workflowId, workflowId))

      await tx
        .update(workflowDeploymentVersion)
        .set({ isActive: false })
        .where(eq(workflowDeploymentVersion.workflowId, workflowId))

      await tx
        .update(workflows)
        .set({ isDeployed: false, deployedAt: null })
        .where(eq(workflows.id, workflowId))
    })

    logger.info(`Undeployed workflow ${workflowId}`)
    return { success: true }
  } catch (error) {
    logger.error(`Error undeploying workflow ${workflowId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to undeploy workflow',
    }
  }
}

/**
 * Activate a specific deployment version by ID for a workflow.
 */
export async function activateWorkflowVersionById(params: {
  workflowId: string
  deploymentVersionId: string
}): Promise<{
  success: boolean
  deployedAt?: Date
  state?: unknown
  error?: string
}> {
  const { workflowId, deploymentVersionId } = params

  try {
    const [versionData] = await db
      .select({ id: workflowDeploymentVersion.id, state: workflowDeploymentVersion.state })
      .from(workflowDeploymentVersion)
      .where(
        and(
          eq(workflowDeploymentVersion.workflowId, workflowId),
          eq(workflowDeploymentVersion.id, deploymentVersionId)
        )
      )
      .limit(1)

    if (!versionData) {
      return { success: false, error: 'Deployment version not found' }
    }

    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .update(workflowDeploymentVersion)
        .set({ isActive: false })
        .where(eq(workflowDeploymentVersion.workflowId, workflowId))

      await tx
        .update(workflowDeploymentVersion)
        .set({ isActive: true })
        .where(
          and(
            eq(workflowDeploymentVersion.workflowId, workflowId),
            eq(workflowDeploymentVersion.id, deploymentVersionId)
          )
        )

      await tx
        .update(workflows)
        .set({ isDeployed: true, deployedAt: now })
        .where(eq(workflows.id, workflowId))
    })

    logger.info(`Activated deployment version ${deploymentVersionId} for workflow ${workflowId}`)

    return {
      success: true,
      deployedAt: now,
      state: versionData.state,
    }
  } catch (error) {
    logger.error(
      `Error activating deployment version ${deploymentVersionId} for workflow ${workflowId}:`,
      error
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to activate version',
    }
  }
}

/**
 * Save workflow state to normalized tables (blocks, edges, subflows).
 * Used by the revert route to restore a deployed version's state.
 * Copied from Sim's lib/workflows/persistence/utils.ts
 */
export async function saveWorkflowToNormalizedTables(
  workflowId: string,
  state: WorkflowState
): Promise<{ success: boolean; error?: string }> {
  try {
    const blockRecords = state.blocks as Record<string, BlockState>
    const canonicalLoops = generateLoopBlocks(blockRecords)
    const canonicalParallels = generateParallelBlocks(blockRecords)

    // Start a transaction
    await db.transaction(async (tx) => {
      await Promise.all([
        tx.delete(workflowBlocks).where(eq(workflowBlocks.workflowId, workflowId)),
        tx.delete(workflowEdges).where(eq(workflowEdges.workflowId, workflowId)),
        tx.delete(workflowSubflows).where(eq(workflowSubflows.workflowId, workflowId)),
      ])

      // Insert blocks
      if (Object.keys(state.blocks).length > 0) {
        const blockInserts = Object.values(state.blocks).map((block) => ({
          id: block.id,
          workflowId: workflowId,
          type: block.type,
          name: block.name || '',
          positionX: String(block.position?.x || 0),
          positionY: String(block.position?.y || 0),
          enabled: block.enabled ?? true,
          horizontalHandles: block.horizontalHandles ?? true,
          advancedMode: block.advancedMode ?? false,
          triggerMode: block.triggerMode ?? false,
          height: block.height || 0,
          subBlocks: block.subBlocks || {},
          outputs: block.outputs || {},
          data: (block.data || {}) as Record<string, unknown>,
          locked: block.locked ?? false,
        }))

        await tx.insert(workflowBlocks).values(blockInserts)
      }

      // Insert edges
      if (state.edges.length > 0) {
        const edgeInserts = state.edges.map((edge) => ({
          id: edge.id,
          workflowId: workflowId,
          sourceBlockId: edge.source,
          targetBlockId: edge.target,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
        }))

        await tx.insert(workflowEdges).values(edgeInserts)
      }

      // Insert subflows (loops and parallels)
      const subflowInserts: SubflowInsert[] = []

      // Add loops
      Object.values(canonicalLoops).forEach((loop) => {
        subflowInserts.push({
          id: loop.id,
          workflowId: workflowId,
          type: SUBFLOW_TYPES.LOOP,
          config: loop as unknown as Record<string, unknown>,
        })
      })

      // Add parallels
      Object.values(canonicalParallels).forEach((parallel) => {
        subflowInserts.push({
          id: parallel.id,
          workflowId: workflowId,
          type: SUBFLOW_TYPES.PARALLEL,
          config: parallel as unknown as Record<string, unknown>,
        })
      })

      if (subflowInserts.length > 0) {
        await tx.insert(workflowSubflows).values(subflowInserts)
      }
    })

    return { success: true }
  } catch (error) {
    logger.error(`Error saving workflow ${workflowId} to normalized tables:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Activate a specific deployment version by version number.
 * Copied from Sim's lib/workflows/persistence/utils.ts
 */
export async function activateWorkflowVersion(params: {
  workflowId: string
  version: number
}): Promise<{
  success: boolean
  deployedAt?: Date
  state?: unknown
  error?: string
}> {
  const { workflowId, version } = params

  try {
    const [versionData] = await db
      .select({ id: workflowDeploymentVersion.id, state: workflowDeploymentVersion.state })
      .from(workflowDeploymentVersion)
      .where(
        and(
          eq(workflowDeploymentVersion.workflowId, workflowId),
          eq(workflowDeploymentVersion.version, version)
        )
      )
      .limit(1)

    if (!versionData) {
      return { success: false, error: 'Deployment version not found' }
    }

    const now = new Date()

    await db.transaction(async (tx) => {
      await tx
        .update(workflowDeploymentVersion)
        .set({ isActive: false })
        .where(
          and(
            eq(workflowDeploymentVersion.workflowId, workflowId),
            eq(workflowDeploymentVersion.isActive, true)
          )
        )

      await tx
        .update(workflowDeploymentVersion)
        .set({ isActive: true })
        .where(
          and(
            eq(workflowDeploymentVersion.workflowId, workflowId),
            eq(workflowDeploymentVersion.version, version)
          )
        )

      await tx
        .update(workflows)
        .set({ isDeployed: true, deployedAt: now })
        .where(eq(workflows.id, workflowId))
    })

    logger.info(`Activated version ${version} for workflow ${workflowId}`)

    return {
      success: true,
      deployedAt: now,
      state: versionData.state,
    }
  } catch (error) {
    logger.error(`Error activating version ${version} for workflow ${workflowId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to activate version',
    }
  }
}

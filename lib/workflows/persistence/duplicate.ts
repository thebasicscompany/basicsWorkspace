/**
 * Workflow duplication helper.
 * Adapted from Sim's lib/workflows/persistence/duplicate.ts
 *
 * Simplifications:
 * - No workspace permission checks (we use org-scoped auth in the route)
 * - No folder support (we don't have folders yet)
 * - No deduplicateWorkflowName (we append " (Copy)" with numeric suffix)
 * - Condition/edge handle remapping inlined (Sim has lib/workflows/condition-ids.ts)
 */
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  workflows,
  workflowBlocks,
  workflowEdges,
  workflowSubflows,
} from '@/lib/db/schema'
import { createLogger } from '@/lib/sim/logger'

const logger = createLogger('WorkflowDuplicateHelper')

// Condition/router edge handle prefixes from Sim's condition-ids.ts
const HANDLE_PREFIXES = ['condition-', 'route-']

interface DuplicateWorkflowOptions {
  sourceWorkflowId: string
  orgId: string
  userId: string
  name: string
  description?: string
  color?: string
  requestId?: string
  newWorkflowId?: string
}

interface DuplicateWorkflowResult {
  id: string
  name: string
  description: string | null
  color: string | null
  blocksCount: number
  edgesCount: number
  subflowsCount: number
}

/**
 * Remaps condition/router block IDs within subBlock values.
 */
function remapConditionIdsInSubBlocks(
  subBlocks: Record<string, any>,
  oldBlockId: string,
  newBlockId: string
): Record<string, any> {
  const updated: Record<string, any> = {}

  for (const [key, subBlock] of Object.entries(subBlocks)) {
    if (
      subBlock &&
      typeof subBlock === 'object' &&
      (subBlock.type === 'condition-input' || subBlock.type === 'router-input') &&
      typeof subBlock.value === 'string'
    ) {
      try {
        const parsed = JSON.parse(subBlock.value)
        if (Array.isArray(parsed)) {
          let changed = false
          for (const item of parsed) {
            if (item && typeof item === 'object' && typeof item.id === 'string') {
              const oldPrefix = `${oldBlockId}-`
              if (item.id.startsWith(oldPrefix)) {
                item.id = `${newBlockId}-${item.id.slice(oldPrefix.length)}`
                changed = true
              }
            }
          }
          if (changed) {
            updated[key] = { ...subBlock, value: JSON.stringify(parsed) }
            continue
          }
        }
      } catch {
        // Not valid JSON, skip
      }
    }
    updated[key] = subBlock
  }

  return updated
}

/**
 * Remaps variable IDs in variables-input subBlocks.
 */
function remapVariableIdsInSubBlocks(
  subBlocks: Record<string, any>,
  varIdMap: Map<string, string>
): Record<string, any> {
  const updated: Record<string, any> = {}

  for (const [key, subBlock] of Object.entries(subBlocks)) {
    if (
      subBlock &&
      typeof subBlock === 'object' &&
      subBlock.type === 'variables-input' &&
      Array.isArray(subBlock.value)
    ) {
      updated[key] = {
        ...subBlock,
        value: subBlock.value.map((assignment: any) => {
          if (assignment && typeof assignment === 'object' && assignment.variableId) {
            const newVarId = varIdMap.get(assignment.variableId)
            if (newVarId) {
              return { ...assignment, variableId: newVarId }
            }
          }
          return assignment
        }),
      }
    } else {
      updated[key] = subBlock
    }
  }

  return updated
}

/**
 * Remaps condition/router edge handles when block IDs change.
 */
function remapConditionEdgeHandle(
  sourceHandle: string,
  oldBlockId: string,
  newBlockId: string
): string {
  for (const handlePrefix of HANDLE_PREFIXES) {
    if (!sourceHandle.startsWith(handlePrefix)) continue

    const innerId = sourceHandle.slice(handlePrefix.length)
    if (!innerId.startsWith(`${oldBlockId}-`)) continue

    const suffix = innerId.slice(oldBlockId.length + 1)
    return `${handlePrefix}${newBlockId}-${suffix}`
  }

  return sourceHandle
}

/**
 * Find a unique name by appending " (Copy)", " (Copy 2)", etc.
 */
async function findUniqueName(baseName: string, orgId: string): Promise<string> {
  const candidate = `${baseName} (Copy)`
  const [existing] = await db
    .select({ id: workflows.id })
    .from(workflows)
    .where(and(eq(workflows.orgId, orgId), eq(workflows.name, candidate)))
    .limit(1)

  if (!existing) return candidate

  for (let i = 2; i < 100; i++) {
    const numbered = `${baseName} (Copy ${i})`
    const [dup] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(and(eq(workflows.orgId, orgId), eq(workflows.name, numbered)))
      .limit(1)
    if (!dup) return numbered
  }

  return `${baseName} (Copy ${crypto.randomUUID().slice(0, 6)})`
}

/**
 * Duplicate a workflow with all its blocks, edges, and subflows.
 */
export async function duplicateWorkflow(
  options: DuplicateWorkflowOptions
): Promise<DuplicateWorkflowResult> {
  const {
    sourceWorkflowId,
    orgId,
    userId,
    name,
    description,
    color,
    requestId = 'unknown',
    newWorkflowId: clientNewWorkflowId,
  } = options

  const newWorkflowId = clientNewWorkflowId || crypto.randomUUID()
  const now = new Date()

  const result = await db.transaction(async (tx) => {
    // Verify source workflow exists and belongs to this org
    const [source] = await tx
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, sourceWorkflowId as any), eq(workflows.orgId, orgId)))
      .limit(1)

    if (!source) {
      throw new Error('Source workflow not found')
    }

    // Variable ID mapping (old → new)
    const varIdMapping = new Map<string, string>()

    const deduplicatedName = await findUniqueName(name, orgId)

    // Duplicate variables with new IDs
    const sourceVars = (source.variables as Record<string, any>) || {}
    const remappedVars: Record<string, any> = {}
    for (const [oldVarId, variable] of Object.entries(sourceVars)) {
      const newVarId = crypto.randomUUID()
      varIdMapping.set(oldVarId, newVarId)
      remappedVars[newVarId] = {
        ...variable,
        id: newVarId,
        workflowId: newWorkflowId,
      }
    }

    await tx.insert(workflows).values({
      id: newWorkflowId as `${string}-${string}-${string}-${string}-${string}`,
      orgId,
      userId,
      name: deduplicatedName,
      description: description || source.description,
      color: color || source.color,
      variables: remappedVars,
      isDeployed: false,
      runCount: 0,
      sortOrder: (source.sortOrder ?? 0) + 1,
      createdAt: now,
      updatedAt: now,
    })

    // Copy blocks with new IDs
    const sourceBlocks = await tx
      .select()
      .from(workflowBlocks)
      .where(eq(workflowBlocks.workflowId, sourceWorkflowId as any))

    const blockIdMapping = new Map<string, string>()

    if (sourceBlocks.length > 0) {
      // First pass: create all block ID mappings
      sourceBlocks.forEach((block) => {
        blockIdMapping.set(block.id, crypto.randomUUID())
      })

      // Second pass: create blocks with updated references
      const newBlocks = sourceBlocks.map((block) => {
        const newBlockId = blockIdMapping.get(block.id)!

        // Update parent ID for child blocks (loop/parallel children)
        let updatedData = block.data
        if (block.data && typeof block.data === 'object' && !Array.isArray(block.data)) {
          const dataObj = block.data as any
          if (dataObj.parentId && blockIdMapping.has(dataObj.parentId)) {
            updatedData = {
              ...dataObj,
              parentId: blockIdMapping.get(dataObj.parentId)!,
              extent: 'parent',
            }
          }
        }

        // Remap variable references in subBlocks
        let updatedSubBlocks = block.subBlocks
        if (
          varIdMapping.size > 0 &&
          block.subBlocks &&
          typeof block.subBlocks === 'object' &&
          !Array.isArray(block.subBlocks)
        ) {
          updatedSubBlocks = remapVariableIdsInSubBlocks(
            block.subBlocks as Record<string, any>,
            varIdMapping
          )
        }

        // Remap condition/router IDs
        if (updatedSubBlocks && typeof updatedSubBlocks === 'object') {
          updatedSubBlocks = remapConditionIdsInSubBlocks(
            updatedSubBlocks as Record<string, any>,
            block.id,
            newBlockId
          )
        }

        return {
          id: newBlockId as `${string}-${string}-${string}-${string}-${string}`,
          workflowId: newWorkflowId as `${string}-${string}-${string}-${string}-${string}`,
          type: block.type,
          name: block.name,
          positionX: block.positionX,
          positionY: block.positionY,
          enabled: block.enabled,
          advancedMode: block.advancedMode,
          triggerMode: block.triggerMode,
          horizontalHandles: block.horizontalHandles,
          locked: false, // Duplicated blocks are always unlocked
          height: block.height,
          subBlocks: updatedSubBlocks,
          outputs: block.outputs,
          data: updatedData,
          createdAt: now,
          updatedAt: now,
        }
      })

      await tx.insert(workflowBlocks).values(newBlocks)
      logger.info(`[${requestId}] Copied ${sourceBlocks.length} blocks`)
    }

    // Copy edges with updated block references
    const sourceEdges = await tx
      .select()
      .from(workflowEdges)
      .where(eq(workflowEdges.workflowId, sourceWorkflowId as any))

    if (sourceEdges.length > 0) {
      const newEdges = sourceEdges.map((edge) => {
        const newSourceBlockId = blockIdMapping.get(edge.sourceBlockId) || edge.sourceBlockId
        const newSourceHandle =
          edge.sourceHandle && blockIdMapping.has(edge.sourceBlockId)
            ? remapConditionEdgeHandle(edge.sourceHandle, edge.sourceBlockId, newSourceBlockId)
            : edge.sourceHandle

        return {
          id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
          workflowId: newWorkflowId as `${string}-${string}-${string}-${string}-${string}`,
          sourceBlockId: (blockIdMapping.get(edge.sourceBlockId) || edge.sourceBlockId) as `${string}-${string}-${string}-${string}-${string}`,
          targetBlockId: (blockIdMapping.get(edge.targetBlockId) || edge.targetBlockId) as `${string}-${string}-${string}-${string}-${string}`,
          sourceHandle: newSourceHandle,
          targetHandle: edge.targetHandle,
          createdAt: now,
        }
      })

      await tx.insert(workflowEdges).values(newEdges)
      logger.info(`[${requestId}] Copied ${sourceEdges.length} edges`)
    }

    // Copy subflows with updated block references
    const sourceSubflows = await tx
      .select()
      .from(workflowSubflows)
      .where(eq(workflowSubflows.workflowId, sourceWorkflowId as any))

    if (sourceSubflows.length > 0) {
      const newSubflows = sourceSubflows
        .map((subflow) => {
          const newSubflowId = blockIdMapping.get(subflow.id)
          if (!newSubflowId) {
            logger.warn(`[${requestId}] Subflow ${subflow.id} has no corresponding block, skipping`)
            return null
          }

          let updatedConfig = subflow.config
          if (subflow.config && typeof subflow.config === 'object') {
            updatedConfig = JSON.parse(JSON.stringify(subflow.config))
            ;(updatedConfig as any).id = newSubflowId

            if ('nodes' in (updatedConfig as any) && Array.isArray((updatedConfig as any).nodes)) {
              ;(updatedConfig as any).nodes = (updatedConfig as any).nodes.map(
                (nodeId: string) => blockIdMapping.get(nodeId) || nodeId
              )
            }
          }

          return {
            id: newSubflowId,
            workflowId: newWorkflowId,
            type: subflow.type,
            config: updatedConfig as Record<string, unknown>,
            createdAt: now,
          }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)

      if (newSubflows.length > 0) {
        await tx.insert(workflowSubflows).values(newSubflows)
      }
      logger.info(`[${requestId}] Copied ${newSubflows.length}/${sourceSubflows.length} subflows`)
    }

    return {
      id: newWorkflowId,
      name: deduplicatedName,
      description: description || source.description,
      color: color || source.color,
      blocksCount: sourceBlocks.length,
      edgesCount: sourceEdges.length,
      subflowsCount: sourceSubflows.length,
    }
  })

  return result
}

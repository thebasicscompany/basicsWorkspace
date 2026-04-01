/**
 * Edit workflow engine — adapted from Sim's edit-workflow/engine.ts
 * Changes: import paths adjusted, removed @sim/logger
 */
import { isValidKey } from '@/lib/workflows/sanitization/key-validation'
import { validateEdges } from '@/apps/automations/stores/workflows/edge-validation'
import {
  generateLoopBlocks,
  generateParallelBlocks,
} from '@/apps/automations/stores/workflows/workflow/utils'
import { addConnectionsAsEdges, normalizeBlockIdsInOperations } from './builders'
import {
  handleAddOperation,
  handleDeleteOperation,
  handleEditOperation,
  handleExtractFromSubflowOperation,
  handleInsertIntoSubflowOperation,
} from './operations'
import type {
  ApplyOperationsResult,
  EditWorkflowOperation,
  OperationContext,
  PermissionGroupConfig,
  ValidationError,
} from './types'
import { logSkippedItem, type SkippedItem } from './types'

type OperationHandler = (op: EditWorkflowOperation, ctx: OperationContext) => void

const OPERATION_HANDLERS: Record<EditWorkflowOperation['operation_type'], OperationHandler> = {
  delete: handleDeleteOperation,
  extract_from_subflow: handleExtractFromSubflowOperation,
  add: handleAddOperation,
  insert_into_subflow: handleInsertIntoSubflowOperation,
  edit: handleEditOperation,
}

/**
 * Topologically sort insert operations to ensure parents are created before children
 */
export function topologicalSortInserts(
  inserts: EditWorkflowOperation[],
  adds: EditWorkflowOperation[]
): EditWorkflowOperation[] {
  if (inserts.length === 0) return []

  const insertMap = new Map<string, EditWorkflowOperation>()
  inserts.forEach((op) => insertMap.set(op.block_id, op))

  const addedBlocks = new Set(adds.map((op) => op.block_id))

  const dependents = new Map<string, Set<string>>()
  const dependencies = new Map<string, Set<string>>()

  inserts.forEach((op) => {
    const blockId = op.block_id
    const parentId = op.params?.subflowId

    dependencies.set(blockId, new Set())

    if (parentId) {
      if (insertMap.has(parentId)) {
        dependencies.get(blockId)!.add(parentId)
        if (!dependents.has(parentId)) {
          dependents.set(parentId, new Set())
        }
        dependents.get(parentId)!.add(blockId)
      }
    }
  })

  // Kahn's algorithm
  const sorted: EditWorkflowOperation[] = []
  const queue: string[] = []

  inserts.forEach((op) => {
    const deps = dependencies.get(op.block_id)!
    if (deps.size === 0) {
      queue.push(op.block_id)
    }
  })

  while (queue.length > 0) {
    const blockId = queue.shift()!
    const op = insertMap.get(blockId)
    if (op) {
      sorted.push(op)
    }

    const children = dependents.get(blockId)
    if (children) {
      children.forEach((childId) => {
        const childDeps = dependencies.get(childId)!
        childDeps.delete(blockId)
        if (childDeps.size === 0) {
          queue.push(childId)
        }
      })
    }
  }

  // Append any remaining (cycle case — shouldn't happen)
  if (sorted.length < inserts.length) {
    inserts.forEach((op) => {
      if (!sorted.includes(op)) {
        sorted.push(op)
      }
    })
  }

  return sorted
}

function orderOperations(operations: EditWorkflowOperation[]): EditWorkflowOperation[] {
  const deletes = operations.filter((op) => op.operation_type === 'delete')
  const extracts = operations.filter((op) => op.operation_type === 'extract_from_subflow')
  const adds = operations.filter((op) => op.operation_type === 'add')
  const inserts = operations.filter((op) => op.operation_type === 'insert_into_subflow')
  const edits = operations.filter((op) => op.operation_type === 'edit')

  const sortedInserts = topologicalSortInserts(inserts, adds)

  return [...deletes, ...extracts, ...adds, ...sortedInserts, ...edits]
}

/**
 * Apply operations directly to the workflow JSON state
 */
export function applyOperationsToWorkflowState(
  workflowState: Record<string, unknown>,
  operations: EditWorkflowOperation[],
  permissionConfig: PermissionGroupConfig = null
): ApplyOperationsResult {
  const modifiedState = JSON.parse(JSON.stringify(workflowState))
  const validationErrors: ValidationError[] = []
  const skippedItems: SkippedItem[] = []

  const { normalizedOperations } = normalizeBlockIdsInOperations(operations)
  const orderedOperations = orderOperations(normalizedOperations)

  console.log('[EditWorkflow] Applying operations:', {
    totalOperations: orderedOperations.length,
    operationTypes: orderedOperations.reduce((acc: Record<string, number>, op) => {
      acc[op.operation_type] = (acc[op.operation_type] || 0) + 1
      return acc
    }, {}),
    initialBlockCount: Object.keys((modifiedState as any).blocks || {}).length,
  })

  const ctx: OperationContext = {
    modifiedState,
    skippedItems,
    validationErrors,
    permissionConfig,
    deferredConnections: [],
  }

  for (const operation of orderedOperations) {
    const { operation_type, block_id } = operation

    if (!isValidKey(block_id)) {
      logSkippedItem(skippedItems, {
        type: 'missing_required_params',
        operationType: operation_type,
        blockId: String(block_id || 'invalid'),
        reason: `Invalid block_id "${block_id}" (type: ${typeof block_id}) - operation skipped.`,
      })
      continue
    }

    const handler = OPERATION_HANDLERS[operation_type]
    if (!handler) continue

    handler(operation, ctx)
  }

  // Pass 2: Create all edges from deferred connections
  if (ctx.deferredConnections.length > 0) {
    for (const { blockId, connections } of ctx.deferredConnections) {
      if (!(modifiedState as any).blocks[blockId]) {
        continue
      }
      addConnectionsAsEdges(modifiedState, blockId, connections, skippedItems)
    }
  }

  // Remove edges that cross scope boundaries
  removeInvalidScopeEdges(modifiedState, skippedItems)

  // Regenerate loops and parallels
  ;(modifiedState as any).loops = generateLoopBlocks((modifiedState as any).blocks)
  ;(modifiedState as any).parallels = generateParallelBlocks((modifiedState as any).blocks)

  // Validate all blocks have types
  const blocksWithoutType = Object.entries((modifiedState as any).blocks || {})
    .filter(([_, block]: [string, any]) => !block.type || block.type === undefined)
    .map(([id, block]: [string, any]) => ({ id, block }))

  if (blocksWithoutType.length > 0) {
    blocksWithoutType.forEach(({ id }) => {
      delete (modifiedState as any).blocks[id]
    })

    const removedIds = new Set(blocksWithoutType.map(({ id }) => id))
    ;(modifiedState as any).edges = ((modifiedState as any).edges || []).filter(
      (edge: any) => !removedIds.has(edge.source) && !removedIds.has(edge.target)
    )
  }

  return { state: modifiedState, validationErrors, skippedItems }
}

function removeInvalidScopeEdges(modifiedState: any, skippedItems: SkippedItem[]): void {
  const { valid, dropped } = validateEdges(modifiedState.edges || [], modifiedState.blocks || {})
  modifiedState.edges = valid

  if (dropped.length > 0) {
    for (const { edge, reason } of dropped) {
      logSkippedItem(skippedItems, {
        type: 'invalid_edge_scope',
        operationType: 'add_edge',
        blockId: edge.source,
        reason: `Edge from "${edge.source}" to "${edge.target}" skipped - ${reason}`,
        details: {
          edgeId: edge.id,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          targetId: edge.target,
        },
      })
    }
  }
}

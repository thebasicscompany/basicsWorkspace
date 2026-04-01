/**
 * Edit workflow operations — adapted from Sim's edit-workflow/operations.ts
 * Changes: import paths adjusted, removed @sim/logger, simplified TriggerUtils usage,
 * removed PermissionGroupConfig import
 */
import { isValidKey } from '@/lib/workflows/sanitization/key-validation'
import { TriggerUtils } from '@/lib/workflows/triggers/triggers'
import { getBlock } from '@/lib/sim/blocks/registry'
import { normalizeName, RESERVED_BLOCK_NAMES } from '@/lib/sim/executor/constants'
import { TRIGGER_RUNTIME_SUBBLOCK_IDS } from '@/lib/sim/triggers/constants'
import {
  applyTriggerConfigToBlockSubblocks,
  createBlockFromParams,
  filterDisallowedTools,
  JSON_STRING_SUBBLOCK_KEYS,
  normalizeArrayWithIds,
  normalizeConditionRouterIds,
  normalizeResponseFormat,
  normalizeTools,
  shouldNormalizeArrayIds,
  updateCanonicalModesForInputs,
} from './builders'
import type { EditWorkflowOperation, OperationContext } from './types'
import { logSkippedItem } from './types'
import {
  findBlockWithDuplicateNormalizedName,
  isBlockTypeAllowed,
  validateInputsForBlock,
} from './validation'

/**
 * Stub: Check if adding a trigger block would be a duplicate.
 * Returns null if OK, or { triggerName, issue } if blocked.
 */
function getTriggerAdditionIssue(
  blocks: Record<string, any>,
  blockType: string
): { triggerName: string; issue: string } | null {
  // Only restrict actual trigger blocks
  if (!TriggerUtils.isTriggerBlock(blockType)) return null

  // Check if any existing block is already a trigger
  const existingTrigger = Object.values(blocks).find((b: any) =>
    TriggerUtils.isTriggerBlock(b.type)
  )
  if (existingTrigger) {
    return {
      triggerName: blockType,
      issue: `A trigger block already exists in this workflow`,
    }
  }
  return null
}

/**
 * Stub: Check if a block type is single-instance and one already exists.
 */
function getSingleInstanceBlockIssue(
  blocks: Record<string, any>,
  blockType: string
): { blockName: string } | null {
  // Response blocks are single-instance
  if (blockType === 'response') {
    const existing = Object.values(blocks).find((b: any) => b.type === 'response')
    if (existing) {
      return { blockName: 'Response' }
    }
  }
  return null
}

export function handleDeleteOperation(op: EditWorkflowOperation, ctx: OperationContext): void {
  const { modifiedState, skippedItems } = ctx
  const { block_id } = op

  if (!modifiedState.blocks[block_id]) {
    logSkippedItem(skippedItems, {
      type: 'block_not_found',
      operationType: 'delete',
      blockId: block_id,
      reason: `Block "${block_id}" does not exist and cannot be deleted`,
    })
    return
  }

  const deleteBlock = modifiedState.blocks[block_id]
  const deleteParentId = deleteBlock.data?.parentId as string | undefined
  const deleteParentLocked = deleteParentId ? modifiedState.blocks[deleteParentId]?.locked : false
  if (deleteBlock.locked || deleteParentLocked) {
    logSkippedItem(skippedItems, {
      type: 'block_locked',
      operationType: 'delete',
      blockId: block_id,
      reason: deleteParentLocked
        ? `Block "${block_id}" is inside locked container "${deleteParentId}" and cannot be deleted`
        : `Block "${block_id}" is locked and cannot be deleted`,
    })
    return
  }

  // Find all child blocks to remove
  const blocksToRemove = new Set<string>([block_id])
  const findChildren = (parentId: string) => {
    Object.entries(modifiedState.blocks).forEach(([childId, child]: [string, any]) => {
      if (child.data?.parentId === parentId) {
        blocksToRemove.add(childId)
        findChildren(childId)
      }
    })
  }
  findChildren(block_id)

  blocksToRemove.forEach((id) => delete modifiedState.blocks[id])

  modifiedState.edges = modifiedState.edges.filter(
    (edge: any) => !blocksToRemove.has(edge.source) && !blocksToRemove.has(edge.target)
  )
}

export function handleEditOperation(op: EditWorkflowOperation, ctx: OperationContext): void {
  const { modifiedState, skippedItems, validationErrors, permissionConfig, deferredConnections } =
    ctx
  const { block_id, params } = op

  if (!modifiedState.blocks[block_id]) {
    logSkippedItem(skippedItems, {
      type: 'block_not_found',
      operationType: 'edit',
      blockId: block_id,
      reason: `Block "${block_id}" does not exist and cannot be edited`,
    })
    return
  }

  const block = modifiedState.blocks[block_id]

  const editParentId = block.data?.parentId as string | undefined
  const editParentLocked = editParentId ? modifiedState.blocks[editParentId]?.locked : false
  if (block.locked || editParentLocked) {
    logSkippedItem(skippedItems, {
      type: 'block_locked',
      operationType: 'edit',
      blockId: block_id,
      reason: editParentLocked
        ? `Block "${block_id}" is inside locked container "${editParentId}" and cannot be edited`
        : `Block "${block_id}" is locked and cannot be edited`,
    })
    return
  }

  if (!block.type) {
    logSkippedItem(skippedItems, {
      type: 'block_not_found',
      operationType: 'edit',
      blockId: block_id,
      reason: `Block "${block_id}" exists but has no type property`,
    })
    return
  }

  // Update inputs (convert to subBlocks format)
  if (params?.inputs) {
    if (!block.subBlocks) block.subBlocks = {}

    const validationResult = validateInputsForBlock(block.type, params.inputs, block_id)
    validationErrors.push(...validationResult.errors)

    Object.entries(validationResult.validInputs).forEach(([inputKey, value]) => {
      let key = inputKey
      if (key === 'credentials' && !block.subBlocks.credentials && block.subBlocks.credential) {
        key = 'credential'
      }

      if (TRIGGER_RUNTIME_SUBBLOCK_IDS.includes(key)) {
        return
      }
      let sanitizedValue = value

      if (shouldNormalizeArrayIds(key)) {
        sanitizedValue = normalizeArrayWithIds(value)
        if (JSON_STRING_SUBBLOCK_KEYS.has(key)) {
          sanitizedValue = JSON.stringify(sanitizedValue)
        }
      }

      sanitizedValue = normalizeConditionRouterIds(block_id, key, sanitizedValue)

      if (key === 'tools' && Array.isArray(value)) {
        sanitizedValue = filterDisallowedTools(
          normalizeTools(value),
          permissionConfig,
          block_id,
          skippedItems
        )
      }

      if (key === 'responseFormat' && value) {
        sanitizedValue = normalizeResponseFormat(value)
      }

      if (!block.subBlocks[key]) {
        const subBlockDef = getBlock(block.type)?.subBlocks.find((sb) => sb.id === key)
        block.subBlocks[key] = {
          id: key,
          type: subBlockDef?.type || 'short-input',
          value: sanitizedValue,
        }
      } else {
        const existingValue = block.subBlocks[key].value
        const valuesEqual =
          typeof existingValue === 'object' || typeof sanitizedValue === 'object'
            ? JSON.stringify(existingValue) === JSON.stringify(sanitizedValue)
            : existingValue === sanitizedValue

        if (!valuesEqual) {
          block.subBlocks[key].value = sanitizedValue
        }
      }
    })

    if (
      Object.hasOwn(params.inputs, 'triggerConfig') &&
      block.subBlocks.triggerConfig &&
      typeof block.subBlocks.triggerConfig.value === 'object'
    ) {
      applyTriggerConfigToBlockSubblocks(block, block.subBlocks.triggerConfig.value)
    }

    // Update loop/parallel configuration
    if (block.type === 'loop') {
      block.data = block.data || {}
      if (params.inputs.loopType !== undefined) {
        const validLoopTypes = ['for', 'forEach', 'while', 'doWhile']
        if (validLoopTypes.includes(params.inputs.loopType)) {
          block.data.loopType = params.inputs.loopType
        }
      }
      const effectiveLoopType = params.inputs.loopType ?? block.data.loopType ?? 'for'
      if (params.inputs.iterations !== undefined && effectiveLoopType === 'for') {
        block.data.count = params.inputs.iterations
      }
      if (params.inputs.collection !== undefined && effectiveLoopType === 'forEach') {
        block.data.collection = params.inputs.collection
      }
      if (
        params.inputs.condition !== undefined &&
        (effectiveLoopType === 'while' || effectiveLoopType === 'doWhile')
      ) {
        if (effectiveLoopType === 'doWhile') {
          block.data.doWhileCondition = params.inputs.condition
        } else {
          block.data.whileCondition = params.inputs.condition
        }
      }
    } else if (block.type === 'parallel') {
      block.data = block.data || {}
      if (params.inputs.parallelType !== undefined) {
        const validParallelTypes = ['count', 'collection']
        if (validParallelTypes.includes(params.inputs.parallelType)) {
          block.data.parallelType = params.inputs.parallelType
        }
      }
      const effectiveParallelType =
        params.inputs.parallelType ?? block.data.parallelType ?? 'count'
      if (params.inputs.count !== undefined && effectiveParallelType === 'count') {
        block.data.count = params.inputs.count
      }
      if (params.inputs.collection !== undefined && effectiveParallelType === 'collection') {
        block.data.collection = params.inputs.collection
      }
    }

    const editBlockConfig = getBlock(block.type)
    if (editBlockConfig) {
      updateCanonicalModesForInputs(
        block,
        Object.keys(validationResult.validInputs),
        editBlockConfig
      )
    }
  }

  // Update basic properties
  if (params?.type !== undefined) {
    const isContainerType = params.type === 'loop' || params.type === 'parallel'
    const blockConfig = getBlock(params.type)
    if (!blockConfig && !isContainerType) {
      logSkippedItem(skippedItems, {
        type: 'invalid_block_type',
        operationType: 'edit',
        blockId: block_id,
        reason: `Invalid block type "${params.type}" - type change skipped`,
        details: { requestedType: params.type },
      })
    } else if (!isContainerType && !isBlockTypeAllowed(params.type, permissionConfig)) {
      logSkippedItem(skippedItems, {
        type: 'block_not_allowed',
        operationType: 'edit',
        blockId: block_id,
        reason: `Block type "${params.type}" is not allowed by permission group - type change skipped`,
        details: { requestedType: params.type },
      })
    } else {
      block.type = params.type
    }
  }
  if (params?.name !== undefined) {
    const normalizedName = normalizeName(params.name)
    if (!normalizedName) {
      logSkippedItem(skippedItems, {
        type: 'missing_required_params',
        operationType: 'edit',
        blockId: block_id,
        reason: `Cannot rename to empty name`,
        details: { requestedName: params.name },
      })
    } else if ((RESERVED_BLOCK_NAMES as readonly string[]).includes(normalizedName)) {
      logSkippedItem(skippedItems, {
        type: 'reserved_block_name',
        operationType: 'edit',
        blockId: block_id,
        reason: `Cannot rename to "${params.name}" - this is a reserved name`,
        details: { requestedName: params.name },
      })
    } else {
      const conflictingBlock = findBlockWithDuplicateNormalizedName(
        modifiedState.blocks,
        params.name,
        block_id
      )

      if (conflictingBlock) {
        logSkippedItem(skippedItems, {
          type: 'duplicate_block_name',
          operationType: 'edit',
          blockId: block_id,
          reason: `Cannot rename to "${params.name}" - conflicts with "${conflictingBlock[1].name}"`,
          details: {
            requestedName: params.name,
            conflictingBlockId: conflictingBlock[0],
            conflictingBlockName: conflictingBlock[1].name,
          },
        })
      } else {
        block.name = params.name
      }
    }
  }

  if (typeof params?.triggerMode === 'boolean') {
    block.triggerMode = params.triggerMode
    if (params.triggerMode === true) {
      modifiedState.edges = modifiedState.edges.filter((edge: any) => edge.target !== block_id)
    }
  }

  if (typeof params?.advancedMode === 'boolean') {
    block.advancedMode = params.advancedMode
  }

  // Handle nested nodes update (for loops/parallels)
  if (params?.nestedNodes) {
    const existingChildren: Array<[string, any]> = Object.entries(modifiedState.blocks).filter(
      ([, b]: [string, any]) => b.data?.parentId === block_id
    )

    const existingByName = new Map<string, [string, any]>()
    for (const [id, child] of existingChildren) {
      existingByName.set(normalizeName(child.name), [id, child])
    }

    const matchedExistingIds = new Set<string>()

    Object.entries(params.nestedNodes).forEach(([childId, childBlock]: [string, any]) => {
      if (childBlock.type === 'loop' || childBlock.type === 'parallel') {
        logSkippedItem(skippedItems, {
          type: 'nested_subflow_not_allowed',
          operationType: 'edit_nested_node',
          blockId: childId,
          reason: `Cannot nest ${childBlock.type} inside ${block.type} - nested subflows are not supported`,
          details: { parentType: block.type, childType: childBlock.type },
        })
        return
      }

      const incomingName = normalizeName(childBlock.name || '')
      const existingMatch = incomingName ? existingByName.get(incomingName) : undefined

      if (existingMatch) {
        const [existingId, existingBlock] = existingMatch
        matchedExistingIds.add(existingId)

        if (childBlock.inputs) {
          if (!existingBlock.subBlocks) existingBlock.subBlocks = {}
          const childValidation = validateInputsForBlock(
            existingBlock.type,
            childBlock.inputs,
            existingId
          )
          validationErrors.push(...childValidation.errors)

          Object.entries(childValidation.validInputs).forEach(([key, value]) => {
            if (TRIGGER_RUNTIME_SUBBLOCK_IDS.includes(key)) return
            let sanitizedValue = value
            if (shouldNormalizeArrayIds(key)) {
              sanitizedValue = normalizeArrayWithIds(value)
            }
            sanitizedValue = normalizeConditionRouterIds(existingId, key, sanitizedValue)
            if (key === 'tools' && Array.isArray(value)) {
              sanitizedValue = filterDisallowedTools(
                normalizeTools(value),
                permissionConfig,
                existingId,
                skippedItems
              )
            }
            if (key === 'responseFormat' && value) {
              sanitizedValue = normalizeResponseFormat(value)
            }

            const subBlockDef = getBlock(existingBlock.type)?.subBlocks.find(
              (sb: any) => sb.id === key
            )
            if (!existingBlock.subBlocks[key]) {
              existingBlock.subBlocks[key] = {
                id: key,
                type: subBlockDef?.type || 'short-input',
                value: sanitizedValue,
              }
            } else {
              existingBlock.subBlocks[key].value = sanitizedValue
            }
          })
        }

        if (childBlock.connections) {
          modifiedState.edges = modifiedState.edges.filter(
            (edge: any) => edge.source !== existingId
          )
          deferredConnections.push({
            blockId: existingId,
            connections: childBlock.connections,
          })
        }
      } else {
        if (!isValidKey(childId)) {
          logSkippedItem(skippedItems, {
            type: 'missing_required_params',
            operationType: 'add_nested_node',
            blockId: String(childId || 'invalid'),
            reason: `Invalid childId "${childId}" in nestedNodes - child block skipped`,
          })
          return
        }

        const childBlockState = createBlockFromParams(
          childId,
          childBlock,
          block_id,
          validationErrors,
          permissionConfig,
          skippedItems
        )
        modifiedState.blocks[childId] = childBlockState

        if (childBlock.connections) {
          deferredConnections.push({
            blockId: childId,
            connections: childBlock.connections,
          })
        }
      }
    })

    const removedIds = new Set<string>()
    for (const [existingId] of existingChildren) {
      if (!matchedExistingIds.has(existingId)) {
        delete modifiedState.blocks[existingId]
        removedIds.add(existingId)
      }
    }
    if (removedIds.size > 0) {
      modifiedState.edges = modifiedState.edges.filter(
        (edge: any) => !removedIds.has(edge.source) && !removedIds.has(edge.target)
      )
    }
  }

  // Defer connections to pass 2
  if (params?.connections) {
    modifiedState.edges = modifiedState.edges.filter((edge: any) => edge.source !== block_id)
    deferredConnections.push({
      blockId: block_id,
      connections: params.connections,
    })
  }

  // Handle edge removal
  if (params?.removeEdges && Array.isArray(params.removeEdges)) {
    params.removeEdges.forEach(({ targetBlockId, sourceHandle = 'source' }: any) => {
      modifiedState.edges = modifiedState.edges.filter(
        (edge: any) =>
          !(
            edge.source === block_id &&
            edge.target === targetBlockId &&
            edge.sourceHandle === sourceHandle
          )
      )
    })
  }
}

export function handleAddOperation(op: EditWorkflowOperation, ctx: OperationContext): void {
  const { modifiedState, skippedItems, validationErrors, permissionConfig, deferredConnections } =
    ctx
  const { block_id, params } = op

  const addNormalizedName = params?.name ? normalizeName(params.name) : ''
  if (!params?.type || !params?.name || !addNormalizedName) {
    logSkippedItem(skippedItems, {
      type: 'missing_required_params',
      operationType: 'add',
      blockId: block_id,
      reason: `Missing required params (type or name) for adding block "${block_id}"`,
      details: { hasType: !!params?.type, hasName: !!params?.name },
    })
    return
  }

  if ((RESERVED_BLOCK_NAMES as readonly string[]).includes(addNormalizedName)) {
    logSkippedItem(skippedItems, {
      type: 'reserved_block_name',
      operationType: 'add',
      blockId: block_id,
      reason: `Block name "${params.name}" is a reserved name and cannot be used`,
      details: { requestedName: params.name },
    })
    return
  }

  const conflictingBlock = findBlockWithDuplicateNormalizedName(
    modifiedState.blocks,
    params.name,
    block_id
  )

  if (conflictingBlock) {
    logSkippedItem(skippedItems, {
      type: 'duplicate_block_name',
      operationType: 'add',
      blockId: block_id,
      reason: `Block name "${params.name}" conflicts with existing block "${conflictingBlock[1].name}"`,
      details: {
        requestedName: params.name,
        conflictingBlockId: conflictingBlock[0],
        conflictingBlockName: conflictingBlock[1].name,
      },
    })
    return
  }

  const isContainerType = params.type === 'loop' || params.type === 'parallel'
  const addBlockConfig = getBlock(params.type)
  if (!addBlockConfig && !isContainerType) {
    logSkippedItem(skippedItems, {
      type: 'invalid_block_type',
      operationType: 'add',
      blockId: block_id,
      reason: `Invalid block type "${params.type}" - block not added`,
      details: { requestedType: params.type },
    })
    return
  }

  if (!isContainerType && !isBlockTypeAllowed(params.type, permissionConfig)) {
    logSkippedItem(skippedItems, {
      type: 'block_not_allowed',
      operationType: 'add',
      blockId: block_id,
      reason: `Block type "${params.type}" is not allowed by permission group - block not added`,
      details: { requestedType: params.type },
    })
    return
  }

  const triggerIssue = getTriggerAdditionIssue(modifiedState.blocks, params.type)
  if (triggerIssue) {
    logSkippedItem(skippedItems, {
      type: 'duplicate_trigger',
      operationType: 'add',
      blockId: block_id,
      reason: `Cannot add ${triggerIssue.triggerName} - a workflow can only have one`,
      details: { requestedType: params.type, issue: triggerIssue.issue },
    })
    return
  }

  const singleInstanceIssue = getSingleInstanceBlockIssue(modifiedState.blocks, params.type)
  if (singleInstanceIssue) {
    logSkippedItem(skippedItems, {
      type: 'duplicate_single_instance_block',
      operationType: 'add',
      blockId: block_id,
      reason: `Cannot add ${singleInstanceIssue.blockName} - a workflow can only have one`,
      details: { requestedType: params.type },
    })
    return
  }

  const newBlock = createBlockFromParams(
    block_id,
    params,
    undefined,
    validationErrors,
    permissionConfig,
    skippedItems
  )

  // Set loop/parallel data on parent block
  if (params.nestedNodes) {
    if (params.type === 'loop') {
      const validLoopTypes = ['for', 'forEach', 'while', 'doWhile']
      const loopType =
        params.inputs?.loopType && validLoopTypes.includes(params.inputs.loopType)
          ? params.inputs.loopType
          : 'for'
      newBlock.data = {
        ...newBlock.data,
        loopType,
        ...(loopType === 'forEach' &&
          params.inputs?.collection && { collection: params.inputs.collection }),
        ...(loopType === 'for' && params.inputs?.iterations && { count: params.inputs.iterations }),
        ...(loopType === 'while' &&
          params.inputs?.condition && { whileCondition: params.inputs.condition }),
        ...(loopType === 'doWhile' &&
          params.inputs?.condition && { doWhileCondition: params.inputs.condition }),
      }
    } else if (params.type === 'parallel') {
      const validParallelTypes = ['count', 'collection']
      const parallelType =
        params.inputs?.parallelType && validParallelTypes.includes(params.inputs.parallelType)
          ? params.inputs.parallelType
          : 'count'
      newBlock.data = {
        ...newBlock.data,
        parallelType,
        ...(parallelType === 'collection' &&
          params.inputs?.collection && { collection: params.inputs.collection }),
        ...(parallelType === 'count' && params.inputs?.count && { count: params.inputs.count }),
      }
    }
  }

  modifiedState.blocks[block_id] = newBlock

  // Handle nested nodes
  if (params.nestedNodes) {
    Object.entries(params.nestedNodes).forEach(([childId, childBlock]: [string, any]) => {
      if (!isValidKey(childId)) {
        logSkippedItem(skippedItems, {
          type: 'missing_required_params',
          operationType: 'add_nested_node',
          blockId: String(childId || 'invalid'),
          reason: `Invalid childId "${childId}" in nestedNodes - child block skipped`,
        })
        return
      }

      if (childBlock.type === 'loop' || childBlock.type === 'parallel') {
        logSkippedItem(skippedItems, {
          type: 'nested_subflow_not_allowed',
          operationType: 'add_nested_node',
          blockId: childId,
          reason: `Cannot nest ${childBlock.type} inside ${params.type} - nested subflows are not supported`,
          details: { parentType: params.type, childType: childBlock.type },
        })
        return
      }

      const childBlockState = createBlockFromParams(
        childId,
        childBlock,
        block_id,
        validationErrors,
        permissionConfig,
        skippedItems
      )
      modifiedState.blocks[childId] = childBlockState

      if (childBlock.connections) {
        deferredConnections.push({
          blockId: childId,
          connections: childBlock.connections,
        })
      }
    })
  }

  if (params.connections) {
    deferredConnections.push({
      blockId: block_id,
      connections: params.connections,
    })
  }
}

export function handleInsertIntoSubflowOperation(
  op: EditWorkflowOperation,
  ctx: OperationContext
): void {
  const { modifiedState, skippedItems, validationErrors, permissionConfig, deferredConnections } =
    ctx
  const { block_id, params } = op

  const subflowId = params?.subflowId
  if (!subflowId || !params?.type || !params?.name) {
    logSkippedItem(skippedItems, {
      type: 'missing_required_params',
      operationType: 'insert_into_subflow',
      blockId: block_id,
      reason: `Missing required params (subflowId, type, or name) for inserting block "${block_id}"`,
    })
    return
  }

  const subflowBlock = modifiedState.blocks[subflowId]
  if (!subflowBlock) {
    logSkippedItem(skippedItems, {
      type: 'invalid_subflow_parent',
      operationType: 'insert_into_subflow',
      blockId: block_id,
      reason: `Subflow block "${subflowId}" not found`,
    })
    return
  }

  if (subflowBlock.locked) {
    logSkippedItem(skippedItems, {
      type: 'block_locked',
      operationType: 'insert_into_subflow',
      blockId: block_id,
      reason: `Subflow "${subflowId}" is locked`,
    })
    return
  }

  if (subflowBlock.type !== 'loop' && subflowBlock.type !== 'parallel') {
    return
  }

  if (params.type === 'loop' || params.type === 'parallel') {
    logSkippedItem(skippedItems, {
      type: 'nested_subflow_not_allowed',
      operationType: 'insert_into_subflow',
      blockId: block_id,
      reason: `Cannot nest ${params.type} inside ${subflowBlock.type}`,
    })
    return
  }

  const existingBlock = modifiedState.blocks[block_id]

  if (existingBlock) {
    if (existingBlock.type === 'loop' || existingBlock.type === 'parallel') {
      logSkippedItem(skippedItems, {
        type: 'nested_subflow_not_allowed',
        operationType: 'insert_into_subflow',
        blockId: block_id,
        reason: `Cannot move ${existingBlock.type} into ${subflowBlock.type}`,
      })
      return
    }

    if (existingBlock.locked) {
      logSkippedItem(skippedItems, {
        type: 'block_locked',
        operationType: 'insert_into_subflow',
        blockId: block_id,
        reason: `Block "${block_id}" is locked`,
      })
      return
    }

    existingBlock.data = {
      ...existingBlock.data,
      parentId: subflowId,
      extent: 'parent' as const,
    }
    existingBlock.position = { x: 0, y: 0 }

    if (params.inputs) {
      const validationResult = validateInputsForBlock(existingBlock.type, params.inputs, block_id)
      validationErrors.push(...validationResult.errors)

      Object.entries(validationResult.validInputs).forEach(([key, value]) => {
        if (TRIGGER_RUNTIME_SUBBLOCK_IDS.includes(key)) return

        let sanitizedValue = value
        if (shouldNormalizeArrayIds(key)) {
          sanitizedValue = normalizeArrayWithIds(value)
          if (JSON_STRING_SUBBLOCK_KEYS.has(key)) {
            sanitizedValue = JSON.stringify(sanitizedValue)
          }
        }
        sanitizedValue = normalizeConditionRouterIds(block_id, key, sanitizedValue)
        if (key === 'tools' && Array.isArray(value)) {
          sanitizedValue = filterDisallowedTools(
            normalizeTools(value),
            permissionConfig,
            block_id,
            skippedItems
          )
        }
        if (key === 'responseFormat' && value) {
          sanitizedValue = normalizeResponseFormat(value)
        }

        if (!existingBlock.subBlocks[key]) {
          const subBlockDef = getBlock(existingBlock.type)?.subBlocks.find((sb) => sb.id === key)
          existingBlock.subBlocks[key] = {
            id: key,
            type: subBlockDef?.type || 'short-input',
            value: sanitizedValue,
          }
        } else {
          existingBlock.subBlocks[key].value = sanitizedValue
        }
      })

      const existingBlockConfig = getBlock(existingBlock.type)
      if (existingBlockConfig) {
        updateCanonicalModesForInputs(
          existingBlock,
          Object.keys(validationResult.validInputs),
          existingBlockConfig
        )
      }
    }
  } else {
    const isContainerType = params.type === 'loop' || params.type === 'parallel'
    const insertBlockConfig = getBlock(params.type)
    if (!insertBlockConfig && !isContainerType) {
      logSkippedItem(skippedItems, {
        type: 'invalid_block_type',
        operationType: 'insert_into_subflow',
        blockId: block_id,
        reason: `Invalid block type "${params.type}"`,
      })
      return
    }

    if (!isContainerType && !isBlockTypeAllowed(params.type, permissionConfig)) {
      logSkippedItem(skippedItems, {
        type: 'block_not_allowed',
        operationType: 'insert_into_subflow',
        blockId: block_id,
        reason: `Block type "${params.type}" is not allowed`,
      })
      return
    }

    const newBlock = createBlockFromParams(
      block_id,
      params,
      subflowId,
      validationErrors,
      permissionConfig,
      skippedItems
    )
    modifiedState.blocks[block_id] = newBlock
  }

  if (params.connections) {
    modifiedState.edges = modifiedState.edges.filter((edge: any) => edge.source !== block_id)
    deferredConnections.push({
      blockId: block_id,
      connections: params.connections,
    })
  }
}

export function handleExtractFromSubflowOperation(
  op: EditWorkflowOperation,
  ctx: OperationContext
): void {
  const { modifiedState, skippedItems } = ctx
  const { block_id, params } = op

  const subflowId = params?.subflowId
  if (!subflowId) {
    logSkippedItem(skippedItems, {
      type: 'missing_required_params',
      operationType: 'extract_from_subflow',
      blockId: block_id,
      reason: `Missing subflowId for extracting block "${block_id}"`,
    })
    return
  }

  const block = modifiedState.blocks[block_id]
  if (!block) {
    logSkippedItem(skippedItems, {
      type: 'block_not_found',
      operationType: 'extract_from_subflow',
      blockId: block_id,
      reason: `Block "${block_id}" not found for extraction`,
    })
    return
  }

  if (block.locked) {
    logSkippedItem(skippedItems, {
      type: 'block_locked',
      operationType: 'extract_from_subflow',
      blockId: block_id,
      reason: `Block "${block_id}" is locked`,
    })
    return
  }

  const parentSubflow = modifiedState.blocks[subflowId]
  if (parentSubflow?.locked) {
    logSkippedItem(skippedItems, {
      type: 'block_locked',
      operationType: 'extract_from_subflow',
      blockId: block_id,
      reason: `Subflow "${subflowId}" is locked`,
    })
    return
  }

  const container = modifiedState.blocks[subflowId]
  if (container?.position && block.position) {
    block.position = {
      x: (container.position.x ?? 0) + (block.position.x ?? 0),
      y: (container.position.y ?? 0) + (block.position.y ?? 0),
    }
  } else {
    block.position = { x: 0, y: 0 }
  }

  if (block.data) {
    block.data.parentId = undefined
    block.data.extent = undefined
  }
}

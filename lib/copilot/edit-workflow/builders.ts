/**
 * Edit workflow builders — adapted from Sim's edit-workflow/builders.ts
 * Changes: import paths adjusted, removed @sim/logger (use console),
 * removed PermissionGroupConfig import (use local type)
 */
import crypto from 'crypto'
import { getEffectiveBlockOutputs } from '@/lib/workflows/blocks/block-outputs'
import {
  buildCanonicalIndex,
  buildDefaultCanonicalModes,
  isCanonicalPair,
} from '@/lib/workflows/subblocks/visibility'
import { hasTriggerCapability } from '@/lib/workflows/triggers/trigger-utils'
import { getAllBlocks } from '@/lib/sim/blocks/registry'
import type { BlockConfig } from '@/lib/sim/blocks/types'
import { TRIGGER_RUNTIME_SUBBLOCK_IDS } from '@/lib/sim/triggers/constants'
import type {
  EditWorkflowOperation,
  PermissionGroupConfig,
  SkippedItem,
  ValidationError,
} from './types'
import { logSkippedItem, UUID_REGEX } from './types'
import {
  validateInputsForBlock,
  validateSourceHandleForBlock,
  validateTargetHandle,
} from './validation'

/**
 * Helper to create a block state from operation params
 */
export function createBlockFromParams(
  blockId: string,
  params: any,
  parentId?: string,
  errorsCollector?: ValidationError[],
  permissionConfig?: PermissionGroupConfig,
  skippedItems?: SkippedItem[]
): any {
  const blockConfig = getAllBlocks().find((b) => b.type === params.type)

  // Validate inputs against block configuration
  let validatedInputs: Record<string, any> | undefined
  if (params.inputs) {
    const result = validateInputsForBlock(params.type, params.inputs, blockId)
    validatedInputs = result.validInputs
    if (errorsCollector && result.errors.length > 0) {
      errorsCollector.push(...result.errors)
    }
  }

  // Determine outputs based on trigger mode
  const triggerMode = params.triggerMode || false
  const isTriggerCapable = blockConfig ? hasTriggerCapability(blockConfig) : false
  const effectiveTriggerMode = Boolean(triggerMode && isTriggerCapable)
  let outputs: Record<string, any>

  if (params.outputs) {
    outputs = params.outputs
  } else if (blockConfig) {
    const subBlocks: Record<string, any> = {}
    if (validatedInputs) {
      Object.entries(validatedInputs).forEach(([key, value]) => {
        if (TRIGGER_RUNTIME_SUBBLOCK_IDS.includes(key)) {
          return
        }
        subBlocks[key] = { id: key, type: 'short-input', value: value }
      })
    }
    outputs = getEffectiveBlockOutputs(params.type, subBlocks, {
      triggerMode: effectiveTriggerMode,
      preferToolOutputs: !effectiveTriggerMode,
    })
  } else {
    outputs = {}
  }

  const blockState: any = {
    id: blockId,
    type: params.type,
    name: params.name,
    position: { x: 0, y: 0 },
    enabled: params.enabled !== undefined ? params.enabled : true,
    horizontalHandles: true,
    advancedMode: params.advancedMode || false,
    height: 0,
    triggerMode: triggerMode,
    subBlocks: {},
    outputs: outputs,
    data: parentId ? { parentId, extent: 'parent' as const } : {},
    locked: false,
  }

  // Add validated inputs as subBlocks
  if (validatedInputs) {
    Object.entries(validatedInputs).forEach(([key, value]) => {
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

      sanitizedValue = normalizeConditionRouterIds(blockId, key, sanitizedValue)

      if (key === 'tools' && Array.isArray(value)) {
        sanitizedValue = filterDisallowedTools(
          normalizeTools(value),
          permissionConfig ?? null,
          blockId,
          skippedItems ?? []
        )
      }

      if (key === 'responseFormat' && value) {
        sanitizedValue = normalizeResponseFormat(value)
      }

      const subBlockDef = blockConfig?.subBlocks.find((subBlock) => subBlock.id === key)
      blockState.subBlocks[key] = {
        id: key,
        type: subBlockDef?.type || 'short-input',
        value: sanitizedValue,
      }
    })
  }

  // Set up subBlocks from block configuration
  if (blockConfig) {
    blockConfig.subBlocks.forEach((subBlock) => {
      if (!blockState.subBlocks[subBlock.id]) {
        blockState.subBlocks[subBlock.id] = {
          id: subBlock.id,
          type: subBlock.type,
          value: null,
        }
      } else {
        blockState.subBlocks[subBlock.id].type = subBlock.type
      }
    })

    const defaultModes = buildDefaultCanonicalModes(blockConfig.subBlocks)
    if (Object.keys(defaultModes).length > 0) {
      if (!blockState.data) blockState.data = {}
      blockState.data.canonicalModes = defaultModes
    }

    if (validatedInputs) {
      updateCanonicalModesForInputs(blockState, Object.keys(validatedInputs), blockConfig)
    }
  }

  // Initialize default conditions/routes so edge handle validation works
  if (params.type === 'condition' && !blockState.subBlocks.conditions?.value) {
    blockState.subBlocks.conditions = {
      id: 'conditions',
      type: 'condition-input',
      value: JSON.stringify([
        { id: crypto.randomUUID(), title: 'If', value: '' },
        { id: crypto.randomUUID(), title: 'Else', value: '' },
      ]),
    }
  } else if (params.type === 'router' && !blockState.subBlocks.routes?.value) {
    blockState.subBlocks.routes = {
      id: 'routes',
      type: 'router-input',
      value: JSON.stringify([{ id: crypto.randomUUID(), title: 'Route 1', value: '' }]),
    }
  }

  return blockState
}

export function updateCanonicalModesForInputs(
  block: { data?: { canonicalModes?: Record<string, 'basic' | 'advanced'> } },
  inputKeys: string[],
  blockConfig: BlockConfig
): void {
  if (!blockConfig.subBlocks?.length) return

  const canonicalIndex = buildCanonicalIndex(blockConfig.subBlocks)
  const canonicalModeUpdates: Record<string, 'basic' | 'advanced'> = {}

  for (const inputKey of inputKeys) {
    const canonicalId = canonicalIndex.canonicalIdBySubBlockId[inputKey]
    if (!canonicalId) continue

    const group = canonicalIndex.groupsById[canonicalId]
    if (!group || !isCanonicalPair(group)) continue

    const isAdvanced = group.advancedIds.includes(inputKey)
    const existingMode = canonicalModeUpdates[canonicalId]

    if (!existingMode || isAdvanced) {
      canonicalModeUpdates[canonicalId] = isAdvanced ? 'advanced' : 'basic'
    }
  }

  if (Object.keys(canonicalModeUpdates).length > 0) {
    if (!block.data) block.data = {}
    if (!block.data.canonicalModes) block.data.canonicalModes = {}
    Object.assign(block.data.canonicalModes, canonicalModeUpdates)
  }
}

/**
 * Normalize tools array by adding back fields that were sanitized for training
 */
export function normalizeTools(tools: any[]): any[] {
  return tools.map((tool) => {
    if (tool.type === 'custom-tool') {
      if (tool.customToolId && !tool.schema && !tool.code) {
        return {
          type: tool.type,
          customToolId: tool.customToolId,
          usageControl: tool.usageControl || 'auto',
          isExpanded: tool.isExpanded ?? true,
        }
      }

      const normalized: any = {
        ...tool,
        params: tool.params || {},
        isExpanded: tool.isExpanded ?? true,
      }

      if (normalized.schema?.function) {
        normalized.schema = {
          type: 'function',
          function: {
            name: normalized.schema.function.name || tool.title,
            description: normalized.schema.function.description,
            parameters: normalized.schema.function.parameters,
          },
        }
      }

      return normalized
    }

    return {
      ...tool,
      isExpanded: tool.isExpanded ?? true,
    }
  })
}

/**
 * Subblock types that store arrays of objects with `id` fields.
 */
const ARRAY_WITH_ID_SUBBLOCK_TYPES = new Set([
  'inputFormat',
  'headers',
  'params',
  'variables',
  'tagFilters',
  'documentTags',
  'metrics',
  'conditions',
  'routes',
])

/**
 * Subblock keys whose UI components expect a JSON string, not a raw array.
 */
export const JSON_STRING_SUBBLOCK_KEYS = new Set(['conditions', 'routes'])

/**
 * Normalizes array subblock values by ensuring each item has a valid UUID.
 */
export function normalizeArrayWithIds(value: unknown): any[] {
  let arr: any[]

  if (Array.isArray(value)) {
    arr = value
  } else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) return []
      arr = parsed
    } catch {
      return []
    }
  } else {
    return []
  }

  return arr.map((item: any) => {
    if (!item || typeof item !== 'object') {
      return item
    }

    const hasValidUUID = typeof item.id === 'string' && UUID_REGEX.test(item.id)
    if (!hasValidUUID) {
      return { ...item, id: crypto.randomUUID() }
    }

    return item
  })
}

/**
 * Checks if a subblock key should have its array items normalized with UUIDs.
 */
export function shouldNormalizeArrayIds(key: string): boolean {
  return ARRAY_WITH_ID_SUBBLOCK_TYPES.has(key)
}

/**
 * Normalizes condition/router branch IDs to use canonical block-scoped format.
 */
export function normalizeConditionRouterIds(blockId: string, key: string, value: unknown): unknown {
  if (key !== 'conditions' && key !== 'routes') return value

  let parsed: any[]
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) return value
    } catch {
      return value
    }
  } else if (Array.isArray(value)) {
    parsed = value
  } else {
    return value
  }

  let elseIfCounter = 0
  const normalized = parsed.map((item, index) => {
    if (!item || typeof item !== 'object') return item

    let canonicalId: string
    if (key === 'conditions') {
      if (index === 0) {
        canonicalId = `${blockId}-if`
      } else if (index === parsed.length - 1) {
        canonicalId = `${blockId}-else`
      } else {
        canonicalId = `${blockId}-else-if-${elseIfCounter}`
        elseIfCounter++
      }
    } else {
      canonicalId = `${blockId}-route${index + 1}`
    }

    return { ...item, id: canonicalId }
  })

  return typeof value === 'string' ? JSON.stringify(normalized) : normalized
}

/**
 * Normalize responseFormat to ensure consistent storage
 */
export function normalizeResponseFormat(value: any): string {
  try {
    let obj = value

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) {
        return ''
      }
      obj = JSON.parse(trimmed)
    }

    if (obj && typeof obj === 'object') {
      const sortKeys = (item: any): any => {
        if (Array.isArray(item)) {
          return item.map(sortKeys)
        }
        if (item !== null && typeof item === 'object') {
          return Object.keys(item)
            .sort()
            .reduce((result: any, key: string) => {
              result[key] = sortKeys(item[key])
              return result
            }, {})
        }
        return item
      }

      return JSON.stringify(sortKeys(obj), null, 2)
    }

    return String(value)
  } catch {
    return String(value)
  }
}

/**
 * Creates a validated edge between two blocks.
 */
export function createValidatedEdge(
  modifiedState: any,
  sourceBlockId: string,
  targetBlockId: string,
  sourceHandle: string,
  targetHandle: string,
  operationType: string,
  skippedItems?: SkippedItem[]
): boolean {
  if (!modifiedState.blocks[targetBlockId]) {
    console.warn(`[EditWorkflow] Target block "${targetBlockId}" not found. Edge skipped.`)
    skippedItems?.push({
      type: 'invalid_edge_target',
      operationType,
      blockId: sourceBlockId,
      reason: `Edge from "${sourceBlockId}" to "${targetBlockId}" skipped - target block does not exist`,
      details: { sourceHandle, targetHandle, targetId: targetBlockId },
    })
    return false
  }

  const sourceBlock = modifiedState.blocks[sourceBlockId]
  if (!sourceBlock) {
    console.warn(`[EditWorkflow] Source block "${sourceBlockId}" not found. Edge skipped.`)
    skippedItems?.push({
      type: 'invalid_edge_source',
      operationType,
      blockId: sourceBlockId,
      reason: `Edge from "${sourceBlockId}" to "${targetBlockId}" skipped - source block does not exist`,
      details: { sourceHandle, targetHandle, targetId: targetBlockId },
    })
    return false
  }

  const sourceBlockType = sourceBlock.type
  if (!sourceBlockType) {
    skippedItems?.push({
      type: 'invalid_edge_source',
      operationType,
      blockId: sourceBlockId,
      reason: `Edge from "${sourceBlockId}" to "${targetBlockId}" skipped - source block has no type`,
      details: { sourceHandle, targetHandle, targetId: targetBlockId },
    })
    return false
  }

  const sourceValidation = validateSourceHandleForBlock(sourceHandle, sourceBlockType, sourceBlock)
  if (!sourceValidation.valid) {
    skippedItems?.push({
      type: 'invalid_source_handle',
      operationType,
      blockId: sourceBlockId,
      reason: sourceValidation.error || `Invalid source handle "${sourceHandle}"`,
      details: { sourceHandle, targetHandle, targetId: targetBlockId },
    })
    return false
  }

  const targetValidation = validateTargetHandle(targetHandle)
  if (!targetValidation.valid) {
    skippedItems?.push({
      type: 'invalid_target_handle',
      operationType,
      blockId: sourceBlockId,
      reason: targetValidation.error || `Invalid target handle "${targetHandle}"`,
      details: { sourceHandle, targetHandle, targetId: targetBlockId },
    })
    return false
  }

  const finalSourceHandle = sourceValidation.normalizedHandle || sourceHandle

  modifiedState.edges.push({
    id: crypto.randomUUID(),
    source: sourceBlockId,
    sourceHandle: finalSourceHandle,
    target: targetBlockId,
    targetHandle,
    type: 'default',
  })
  return true
}

/**
 * Adds connections as edges for a block.
 */
export function addConnectionsAsEdges(
  modifiedState: any,
  blockId: string,
  connections: Record<string, any>,
  skippedItems?: SkippedItem[]
): void {
  const normalizeHandle = (handle: string): string => {
    if (handle === 'success') return 'source'
    return handle
  }

  Object.entries(connections).forEach(([rawHandle, targets]) => {
    if (targets === null) return

    const sourceHandle = normalizeHandle(rawHandle)

    const addEdgeForTarget = (targetBlock: string, targetHandle?: string) => {
      createValidatedEdge(
        modifiedState,
        blockId,
        targetBlock,
        sourceHandle,
        targetHandle || 'target',
        'add_edge',
        skippedItems
      )
    }

    if (typeof targets === 'string') {
      addEdgeForTarget(targets)
    } else if (Array.isArray(targets)) {
      targets.forEach((target: any) => {
        if (typeof target === 'string') {
          addEdgeForTarget(target)
        } else if (target?.block) {
          addEdgeForTarget(target.block, target.handle)
        }
      })
    } else if (typeof targets === 'object' && targets?.block) {
      addEdgeForTarget(targets.block, targets.handle)
    }
  })
}

export function applyTriggerConfigToBlockSubblocks(block: any, triggerConfig: Record<string, any>) {
  if (!block?.subBlocks || !triggerConfig || typeof triggerConfig !== 'object') {
    return
  }

  Object.entries(triggerConfig).forEach(([configKey, configValue]) => {
    const existingSubblock = block.subBlocks[configKey]
    if (existingSubblock) {
      const existingValue = existingSubblock.value
      const valuesEqual =
        typeof existingValue === 'object' || typeof configValue === 'object'
          ? JSON.stringify(existingValue) === JSON.stringify(configValue)
          : existingValue === configValue

      if (valuesEqual) {
        return
      }

      block.subBlocks[configKey] = {
        ...existingSubblock,
        value: configValue,
      }
    } else {
      block.subBlocks[configKey] = {
        id: configKey,
        type: 'short-input',
        value: configValue,
      }
    }
  })
}

/**
 * Filters out tools that are not allowed by the permission group config
 */
export function filterDisallowedTools(
  tools: any[],
  permissionConfig: PermissionGroupConfig,
  blockId: string,
  skippedItems: SkippedItem[]
): any[] {
  if (!permissionConfig) {
    return tools
  }

  const allowedTools: any[] = []

  for (const tool of tools) {
    if (tool.type === 'custom-tool' && permissionConfig.disableCustomTools) {
      logSkippedItem(skippedItems, {
        type: 'tool_not_allowed',
        operationType: 'add',
        blockId,
        reason: `Custom tool "${tool.title || tool.customToolId || 'unknown'}" is not allowed by permission group - tool not added`,
        details: { toolType: 'custom-tool', toolId: tool.customToolId },
      })
      continue
    }
    if (tool.type === 'mcp' && permissionConfig.disableMcpTools) {
      logSkippedItem(skippedItems, {
        type: 'tool_not_allowed',
        operationType: 'add',
        blockId,
        reason: `MCP tool "${tool.title || 'unknown'}" is not allowed by permission group - tool not added`,
        details: { toolType: 'mcp', serverId: tool.params?.serverId },
      })
      continue
    }
    allowedTools.push(tool)
  }

  return allowedTools
}

/**
 * Normalizes block IDs in operations to ensure they are valid UUIDs.
 */
export function normalizeBlockIdsInOperations(operations: EditWorkflowOperation[]): {
  normalizedOperations: EditWorkflowOperation[]
  idMapping: Map<string, string>
} {
  const idMapping = new Map<string, string>()

  for (const op of operations) {
    if (op.operation_type === 'add' || op.operation_type === 'insert_into_subflow') {
      if (op.block_id && !UUID_REGEX.test(op.block_id)) {
        const newId = crypto.randomUUID()
        idMapping.set(op.block_id, newId)
      }
    }
  }

  if (idMapping.size === 0) {
    return { normalizedOperations: operations, idMapping }
  }

  const replaceId = (id: string | undefined): string | undefined => {
    if (!id) return id
    return idMapping.get(id) ?? id
  }

  const normalizedOperations = operations.map((op) => {
    const normalized: EditWorkflowOperation = {
      ...op,
      block_id: replaceId(op.block_id) ?? op.block_id,
    }

    if (op.params) {
      normalized.params = { ...op.params }

      if (normalized.params.subflowId) {
        normalized.params.subflowId = replaceId(normalized.params.subflowId)
      }

      if (normalized.params.connections) {
        const normalizedConnections: Record<string, any> = {}
        for (const [handle, targets] of Object.entries(normalized.params.connections)) {
          if (typeof targets === 'string') {
            normalizedConnections[handle] = replaceId(targets)
          } else if (Array.isArray(targets)) {
            normalizedConnections[handle] = targets.map((t) => {
              if (typeof t === 'string') return replaceId(t)
              if (t && typeof t === 'object' && t.block) {
                return { ...t, block: replaceId(t.block) }
              }
              return t
            })
          } else if (targets && typeof targets === 'object' && (targets as any).block) {
            normalizedConnections[handle] = { ...targets, block: replaceId((targets as any).block) }
          } else {
            normalizedConnections[handle] = targets
          }
        }
        normalized.params.connections = normalizedConnections
      }

      if (normalized.params.nestedNodes) {
        const normalizedNestedNodes: Record<string, any> = {}
        for (const [childId, childBlock] of Object.entries(normalized.params.nestedNodes)) {
          const newChildId = replaceId(childId) ?? childId
          normalizedNestedNodes[newChildId] = childBlock
        }
        normalized.params.nestedNodes = normalizedNestedNodes
      }
    }

    return normalized
  })

  return { normalizedOperations, idMapping }
}

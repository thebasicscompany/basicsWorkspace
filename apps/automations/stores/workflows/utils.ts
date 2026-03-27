/**
 * Workflow utilities — mirrors Sim's stores/workflows/utils.ts data shapes exactly.
 * The executor reads BlockState + SubBlockState, so these must match Sim 1:1.
 */
import type { Edge, Position } from 'reactflow'
import { getBlock } from '@/lib/sim/blocks'
import type { SubBlockConfig, SubBlockType } from '@/lib/sim/blocks/types'
import { normalizeName } from '@/lib/sim/executor/constants'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'

const DEFAULT_DUPLICATE_OFFSET = { x: 50, y: 50 }

function uuidv4(): string {
  return crypto.randomUUID()
}

function remapConditionEdgeHandle(handle: string, oldBlockId: string, newBlockId: string): string {
  return handle.replace(oldBlockId, newBlockId)
}

// ─── Types matching Sim exactly ──────────────────────────────────────────────

export interface SubBlockState {
  id: string
  type: SubBlockType
  value: any
}

export interface BlockState {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  subBlocks: Record<string, SubBlockState>
  outputs: Record<string, unknown>
  enabled: boolean
  horizontalHandles?: boolean
  height?: number
  advancedMode?: boolean
  triggerMode?: boolean
  data?: Record<string, unknown>
  locked?: boolean
}

// ─── prepareBlockState — exact port from Sim ─────────────────────────────────

export function prepareBlockState(options: {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
  triggerMode?: boolean
}): BlockState {
  const { id, type, name, position, data, triggerMode = false } = options
  const blockConfig = getBlock(type)
  const blockData: Record<string, unknown> = { ...(data || {}) }

  if (!blockConfig) {
    return {
      id,
      type,
      name,
      position,
      data: blockData,
      subBlocks: {},
      outputs: {},
      enabled: true,
      horizontalHandles: true,
      advancedMode: false,
      triggerMode,
      height: 0,
    }
  }

  // Initialize subBlocks from BlockConfig — same logic as Sim
  const subBlocks: Record<string, SubBlockState> = {}

  if (blockConfig.subBlocks) {
    blockConfig.subBlocks.forEach((subBlock: SubBlockConfig) => {
      let initialValue: unknown = null

      if (typeof (subBlock as any).value === 'function') {
        try {
          initialValue = (subBlock as any).value({})
        } catch {
          initialValue = null
        }
      } else if (subBlock.defaultValue !== undefined) {
        initialValue = subBlock.defaultValue
      } else if (subBlock.type === 'input-format' || subBlock.type === 'response-format') {
        initialValue = [
          {
            id: crypto.randomUUID(),
            name: '',
            type: 'string',
            value: '',
            collapsed: false,
          },
        ]
      } else if (subBlock.type === 'table') {
        initialValue = []
      }

      subBlocks[subBlock.id] = {
        id: subBlock.id,
        type: subBlock.type as SubBlockType,
        value: initialValue as SubBlockState['value'],
      }
    })
  }

  // Build outputs from block config
  const outputs: Record<string, unknown> = {}
  if (blockConfig.outputs) {
    for (const [key, def] of Object.entries(blockConfig.outputs)) {
      outputs[key] = def
    }
  }

  return {
    id,
    type,
    name,
    position,
    data: blockData,
    subBlocks,
    outputs,
    enabled: true,
    horizontalHandles: true,
    advancedMode: false,
    triggerMode,
    height: 0,
    locked: false,
  }
}

// ─── Serialize for API (BlockState → API PATCH body) ─────────────────────────

export function blockStateToApiBlock(block: BlockState) {
  return {
    id: block.id,
    type: block.type,
    name: block.name,
    positionX: String(block.position.x),
    positionY: String(block.position.y),
    enabled: block.enabled,
    advancedMode: block.advancedMode,
    triggerMode: block.triggerMode,
    horizontalHandles: block.horizontalHandles,
    locked: block.locked ?? false,
    height: block.height,
    subBlocks: block.subBlocks,
    outputs: block.outputs,
    data: block.data,
  }
}

// ─── Deserialize from API (API response → BlockState) ────────────────────────

export function apiBlockToBlockState(apiBlock: {
  id: string
  type: string
  name: string
  positionX: string | null
  positionY: string | null
  enabled: boolean | null
  advancedMode: boolean | null
  triggerMode?: boolean | null
  horizontalHandles?: boolean | null
  locked?: boolean | null
  height?: number | null
  subBlocks: Record<string, unknown> | null
  outputs: Record<string, unknown> | null
  data: Record<string, unknown> | null
}): BlockState {
  return {
    id: apiBlock.id,
    type: apiBlock.type,
    name: apiBlock.name,
    position: {
      x: parseFloat(apiBlock.positionX ?? '100'),
      y: parseFloat(apiBlock.positionY ?? '100'),
    },
    data: (apiBlock.data as Record<string, unknown>) ?? {},
    subBlocks: (apiBlock.subBlocks as Record<string, SubBlockState>) ?? {},
    outputs: (apiBlock.outputs as Record<string, unknown>) ?? {},
    enabled: apiBlock.enabled ?? true,
    advancedMode: apiBlock.advancedMode ?? false,
    triggerMode: apiBlock.triggerMode ?? false,
    horizontalHandles: apiBlock.horizontalHandles ?? true,
    locked: apiBlock.locked ?? false,
    height: apiBlock.height ?? 0,
  }
}

// ─── Utility functions (ported from Sim stores/workflows/utils.ts) ──────────

/**
 * Filters edges to only include valid ones (both source and target blocks exist)
 */
export function filterValidEdges(edges: Edge[], blocks: Record<string, BlockState>): Edge[] {
  return edges.filter((edge) => {
    return blocks[edge.source] && blocks[edge.target]
  })
}

/**
 * Filters out duplicate edges
 */
export function filterNewEdges(edgesToAdd: Edge[], currentEdges: Edge[]): Edge[] {
  return edgesToAdd.filter((edge) => {
    if (edge.source === edge.target) return false
    return !currentEdges.some(
      (e) =>
        e.source === edge.source &&
        e.sourceHandle === edge.sourceHandle &&
        e.target === edge.target &&
        e.targetHandle === edge.targetHandle
    )
  })
}

/**
 * Generates a unique block name by finding the highest number suffix
 */
export function getUniqueBlockName(baseName: string, existingBlocks: Record<string, any>): string {
  const normalizedBaseName = normalizeName(baseName)
  if (normalizedBaseName === 'start' || normalizedBaseName === 'starter') return 'Start'
  if (normalizedBaseName === 'response') return 'Response'

  const baseNameMatch = baseName.match(/^(.*?)(\s+\d+)?$/)
  const namePrefix = baseNameMatch ? baseNameMatch[1].trim() : baseName
  const normalizedBase = normalizeName(namePrefix)

  const existingNumbers = Object.values(existingBlocks)
    .filter((block: any) => {
      const blockNameMatch = block.name?.match(/^(.*?)(\s+\d+)?$/)
      const blockPrefix = blockNameMatch ? blockNameMatch[1].trim() : block.name
      return blockPrefix && normalizeName(blockPrefix) === normalizedBase
    })
    .map((block: any) => {
      const match = block.name?.match(/(\d+)$/)
      return match ? Number.parseInt(match[1], 10) : 0
    })

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0

  if (maxNumber === 0 && existingNumbers.length === 0) return `${namePrefix} 1`
  return `${namePrefix} ${maxNumber + 1}`
}

/**
 * Merges workflow block states with subblock values from the store.
 * This is critical for the executor — it combines the block structure
 * with the latest user-edited values.
 */
export function mergeSubblockState(
  blocks: Record<string, BlockState>,
  workflowId?: string,
  blockId?: string
): Record<string, BlockState> {
  const subBlockStore = useSubBlockStore.getState()
  const workflowSubblockValues = workflowId ? subBlockStore.workflowValues[workflowId] || {} : {}

  const blocksToProcess = blockId ? { [blockId]: blocks[blockId] } : blocks

  return Object.entries(blocksToProcess).reduce(
    (acc, [id, block]) => {
      if (!block) return acc

      const blockSubBlocks = block.subBlocks || {}
      const blockValues = workflowSubblockValues[id] || {}

      const mergedSubBlocks = Object.entries(blockSubBlocks).reduce(
        (subAcc, [subBlockId, subBlock]) => {
          if (!subBlock) return subAcc

          let storedValue = null
          if (workflowId) {
            if (blockValues[subBlockId] !== undefined) {
              storedValue = blockValues[subBlockId]
            }
          } else {
            storedValue = subBlockStore.getValue(id, subBlockId)
          }

          subAcc[subBlockId] = {
            ...subBlock,
            value: (storedValue !== undefined && storedValue !== null
              ? storedValue
              : subBlock.value) as SubBlockState['value'],
          }
          return subAcc
        },
        {} as Record<string, SubBlockState>
      )

      // Add orphaned values (exist in store but not in block structure)
      Object.entries(blockValues).forEach(([subBlockId, value]) => {
        if (!mergedSubBlocks[subBlockId] && value !== null && value !== undefined) {
          mergedSubBlocks[subBlockId] = {
            id: subBlockId,
            type: 'short-input',
            value: value as SubBlockState['value'],
          }
        }
      })

      acc[id] = { ...block, subBlocks: mergedSubBlocks }
      return acc
    },
    {} as Record<string, BlockState>
  )
}

/**
 * Remaps condition/router block IDs within subBlock values when a block is duplicated.
 */
export function remapConditionIds(
  subBlocks: Record<string, SubBlockState>,
  subBlockValues: Record<string, unknown>,
  oldBlockId: string,
  newBlockId: string
): void {
  for (const [subBlockId, subBlock] of Object.entries(subBlocks)) {
    if (subBlock.type !== 'condition-input' && subBlock.type !== 'router-input') continue

    const value = subBlockValues[subBlockId] ?? subBlock.value
    if (typeof value !== 'string') continue

    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) continue

      let changed = false
      for (const item of parsed) {
        if (item && typeof item === 'object' && item.id) {
          const oldPrefix = `${oldBlockId}-`
          if (typeof item.id === 'string' && item.id.startsWith(oldPrefix)) {
            item.id = `${newBlockId}-${item.id.slice(oldPrefix.length)}`
            changed = true
          }
        }
      }

      if (changed) {
        const newValue = JSON.stringify(parsed)
        subBlock.value = newValue
        subBlockValues[subBlockId] = newValue
      }
    } catch {
      // Not valid JSON, skip
    }
  }
}

/**
 * Regenerates block IDs for paste/duplicate operations.
 * Copied from Sim's stores/workflows/utils.ts with import path changes.
 * Loop/parallel params included for forward compatibility.
 */
export function regenerateBlockIds(
  blocks: Record<string, BlockState>,
  edges: Edge[],
  loops: Record<string, any>,
  parallels: Record<string, any>,
  subBlockValues: Record<string, Record<string, unknown>>,
  positionOffset: { x: number; y: number },
  existingBlockNames: Record<string, BlockState>,
  uniqueNameFn: (name: string, blocks: Record<string, BlockState>) => string
): {
  blocks: Record<string, BlockState>
  edges: Edge[]
  loops: Record<string, any>
  parallels: Record<string, any>
  subBlockValues: Record<string, Record<string, unknown>>
  idMap: Map<string, string>
} {
  const blockIdMap = new Map<string, string>()
  const nameMap = new Map<string, string>()
  const newBlocks: Record<string, BlockState> = {}
  const newSubBlockValues: Record<string, Record<string, unknown>> = {}
  const allBlocksForNaming = { ...existingBlockNames }

  // First pass: generate new IDs and names
  Object.entries(blocks).forEach(([oldId, block]) => {
    const newId = uuidv4()
    blockIdMap.set(oldId, newId)

    const oldNormalizedName = normalizeName(block.name)
    const nameConflicts = Object.values(allBlocksForNaming).some(
      (existing) => normalizeName(existing.name) === oldNormalizedName
    )
    const newName = nameConflicts ? uniqueNameFn(block.name, allBlocksForNaming) : block.name
    nameMap.set(oldNormalizedName, normalizeName(newName))

    const newBlock: BlockState = {
      ...block,
      id: newId,
      name: newName,
      position: {
        x: block.position.x + positionOffset.x,
        y: block.position.y + positionOffset.y,
      },
      subBlocks: JSON.parse(JSON.stringify(block.subBlocks)),
      data: block.data ? { ...block.data } : block.data,
      locked: false,
    }

    newBlocks[newId] = newBlock
    allBlocksForNaming[newId] = newBlock

    if (subBlockValues[oldId]) {
      newSubBlockValues[newId] = JSON.parse(JSON.stringify(subBlockValues[oldId]))
    }

    remapConditionIds(newBlock.subBlocks, newSubBlockValues[newId] || {}, oldId, newId)
  })

  // Second pass: update parentId references
  Object.entries(newBlocks).forEach(([, block]) => {
    if (block.data?.parentId) {
      const oldParentId = block.data.parentId as string
      const newParentId = blockIdMap.get(oldParentId)
      if (newParentId) {
        block.data = { ...block.data, parentId: newParentId, extent: 'parent' }
      } else if (existingBlockNames[oldParentId]) {
        block.data = { ...block.data, parentId: oldParentId, extent: 'parent' }
      } else {
        block.data = { ...block.data, parentId: undefined, extent: undefined }
      }
    }
  })

  // Remap edges
  const newEdges = edges.map((edge) => {
    const newSource = blockIdMap.get(edge.source) || edge.source
    const newSourceHandle =
      edge.sourceHandle && blockIdMap.has(edge.source)
        ? remapConditionEdgeHandle(edge.sourceHandle, edge.source, newSource)
        : edge.sourceHandle
    return {
      ...edge,
      id: uuidv4(),
      source: newSource,
      target: blockIdMap.get(edge.target) || edge.target,
      sourceHandle: newSourceHandle,
    }
  })

  // Remap loops
  const newLoops: Record<string, any> = {}
  Object.entries(loops).forEach(([oldId, loop]) => {
    const newId = blockIdMap.get(oldId) || oldId
    newLoops[newId] = {
      ...loop,
      id: newId,
      nodes: loop.nodes?.map((nodeId: string) => blockIdMap.get(nodeId) || nodeId) ?? [],
    }
  })

  // Remap parallels
  const newParallels: Record<string, any> = {}
  Object.entries(parallels).forEach(([oldId, parallel]) => {
    const newId = blockIdMap.get(oldId) || oldId
    newParallels[newId] = {
      ...parallel,
      id: newId,
      nodes: parallel.nodes?.map((nodeId: string) => blockIdMap.get(nodeId) || nodeId) ?? [],
    }
  })

  return {
    blocks: newBlocks,
    edges: newEdges,
    loops: newLoops,
    parallels: newParallels,
    subBlockValues: newSubBlockValues,
    idMap: blockIdMap,
  }
}

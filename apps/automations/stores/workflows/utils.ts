/**
 * Workflow utilities — mirrors Sim's stores/workflows/utils.ts data shapes exactly.
 * The executor reads BlockState + SubBlockState, so these must match Sim 1:1.
 */
import { getBlock } from '@/lib/sim/blocks'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'

// ─── Types matching Sim exactly ──────────────────────────────────────────────

export interface SubBlockState {
  id: string
  type: string
  value: string | number | string[][] | null
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
        type: subBlock.type,
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

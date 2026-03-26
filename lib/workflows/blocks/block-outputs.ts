// Block output field definitions
import type { OutputSchema } from '@/lib/sim/executor/utils/block-reference'

export interface BlockOutputField {
  id: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
}

export function getBlockOutputFields(_blockType: string): BlockOutputField[] {
  return []
}

/**
 * Get the effective output fields for a block, taking into account
 * dynamic outputs configured at runtime (Phase 4 stub — returns empty schema).
 */
export function getEffectiveBlockOutputs(
  _blockType: string,
  _subBlocks?: Record<string, unknown>,
  _options?: {
    triggerMode?: boolean
    preferToolOutputs?: boolean
    includeHidden?: boolean
  }
): OutputSchema {
  return {}
}

/**
 * Dynamic handle topology — determines if a subblock creates dynamic connection handles.
 * Ported from Sim. Used by the workflow store for edge management.
 */

const DYNAMIC_HANDLE_SUBBLOCK_TYPES = new Set([
  'condition-input',
  'router-input',
])

export function isDynamicHandleSubblock(subBlockType: string): boolean {
  return DYNAMIC_HANDLE_SUBBLOCK_TYPES.has(subBlockType)
}

export function getDynamicHandleSubblockType(
  subBlocks: Record<string, { type: string }>
): string | null {
  for (const [_id, subBlock] of Object.entries(subBlocks)) {
    if (isDynamicHandleSubblock(subBlock.type)) {
      return subBlock.type
    }
  }
  return null
}

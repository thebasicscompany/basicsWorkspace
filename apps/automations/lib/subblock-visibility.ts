/**
 * Subblock visibility utilities — ported from Sim.
 * Handles canonical parameter grouping and dependency resolution.
 */
import type { SubBlockConfig } from '@/lib/sim/blocks/types'

export type CanonicalMode = 'basic' | 'advanced'

export interface CanonicalGroup {
  canonicalId: string
  basicId?: string
  advancedIds: string[]
}

export interface CanonicalIndex {
  groupsById: Record<string, CanonicalGroup>
  canonicalIdBySubBlockId: Record<string, string>
}

export type CanonicalModeOverrides = Record<string, CanonicalMode>

/**
 * Build canonical group indices for a block's subblocks.
 */
export function buildCanonicalIndex(subBlocks: SubBlockConfig[]): CanonicalIndex {
  const groupsById: Record<string, CanonicalGroup> = {}
  const canonicalIdBySubBlockId: Record<string, string> = {}

  subBlocks.forEach((subBlock) => {
    if (!subBlock.canonicalParamId) return
    const canonicalId = subBlock.canonicalParamId
    if (!groupsById[canonicalId]) {
      groupsById[canonicalId] = { canonicalId, advancedIds: [] }
    }
    const group = groupsById[canonicalId]
    if (subBlock.mode === 'advanced') {
      group.advancedIds.push(subBlock.id)
    } else {
      group.basicId = subBlock.id
    }
    canonicalIdBySubBlockId[subBlock.id] = canonicalId
  })

  return { groupsById, canonicalIdBySubBlockId }
}

function getCanonicalValues(
  group: CanonicalGroup,
  values: Record<string, unknown>
): { basicValue: unknown; advancedValue: unknown } {
  const basicValue = group.basicId ? values[group.basicId] : undefined
  const advancedValue = group.advancedIds.length > 0 ? values[group.advancedIds[0]] : undefined
  return { basicValue, advancedValue }
}

function resolveCanonicalMode(
  group: CanonicalGroup,
  values: Record<string, unknown>,
  _overrides?: CanonicalModeOverrides
): CanonicalMode {
  // Default: use basic mode
  return 'basic'
}

/**
 * Resolves the effective value of a dependency field, respecting canonical grouping.
 */
export function resolveDependencyValue(
  dependencyKey: string,
  values: Record<string, unknown>,
  canonicalIndex: CanonicalIndex,
  overrides?: CanonicalModeOverrides
): unknown {
  const canonicalId =
    canonicalIndex.groupsById[dependencyKey]?.canonicalId ||
    canonicalIndex.canonicalIdBySubBlockId[dependencyKey]

  if (!canonicalId) {
    return values[dependencyKey]
  }

  const group = canonicalIndex.groupsById[canonicalId]
  if (!group) return values[dependencyKey]

  const { basicValue, advancedValue } = getCanonicalValues(group, values)
  const mode = resolveCanonicalMode(group, values, overrides)
  if (mode === 'advanced') return advancedValue ?? basicValue
  return basicValue ?? advancedValue
}

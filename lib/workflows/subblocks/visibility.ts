// Subblock visibility rules — controls when sub-block inputs are shown
import type { SubBlockConfig } from '@/lib/sim/blocks/types'

export type CanonicalModeOverrides = Record<string, 'basic' | 'advanced'>

/** A condition that controls whether a subblock is visible */
export type SubBlockCondition =
  | {
      field: string
      value?: string | number | boolean | (string | number | boolean)[]
      not?: boolean
      and?: SubBlockCondition
      op?: string
    }
  | ((values?: Record<string, unknown>) => { field: string; value?: unknown })
  | { and?: SubBlockCondition[]; or?: SubBlockCondition[] }
  | Record<string, unknown>

/** A canonical pair groups a basic and one or more advanced sub-blocks */
export interface CanonicalGroup {
  canonicalId: string
  basicId: string
  advancedIds: string[]
}

/** Index built from a block's subBlocks array for canonical pair resolution */
export interface CanonicalIndex {
  /** Maps canonicalId → CanonicalGroup */
  groupsById: Record<string, CanonicalGroup>
  /** Maps any subblock id → its canonicalId */
  canonicalIdBySubBlockId: Record<string, string>
}

/** Type guard — returns true if group is a valid CanonicalGroup */
export function isCanonicalPair(group: unknown): group is CanonicalGroup {
  return (
    typeof group === 'object' &&
    group !== null &&
    'basicId' in group &&
    'advancedIds' in group
  )
}

/**
 * Resolve whether the active mode for a canonical pair is 'basic' or 'advanced'.
 * Checks explicit overrides first, then falls back to 'basic'.
 */
export function resolveCanonicalMode(
  _group: CanonicalGroup,
  _values: Record<string, unknown>,
  overrides?: CanonicalModeOverrides
): 'basic' | 'advanced' {
  if (overrides && _group.canonicalId in overrides) {
    return overrides[_group.canonicalId]
  }
  return 'basic'
}

/** Extract the basic and advanced values from a canonical group */
export function getCanonicalValues(
  group: CanonicalGroup,
  values: Record<string, unknown>
): { basicValue: unknown; advancedValue: unknown } {
  const basicValue = values[group.basicId]
  const advancedValue = group.advancedIds.length > 0 ? values[group.advancedIds[0]] : undefined
  return { basicValue, advancedValue }
}

/**
 * Build a CanonicalIndex from a block's subBlocks array.
 * Looks for subBlocks that declare a `canonicalId` to group basic/advanced pairs.
 */
export function buildCanonicalIndex(
  subBlocks: SubBlockConfig[],
  _overrides?: CanonicalModeOverrides
): CanonicalIndex {
  const groupsById: Record<string, CanonicalGroup> = {}
  const canonicalIdBySubBlockId: Record<string, string> = {}

  for (const sb of subBlocks) {
    const sbAny = sb as unknown as Record<string, unknown>
    const canonicalId = sbAny.canonicalId as string | undefined
    if (!canonicalId) continue

    const isAdvanced = sbAny.canonicalMode === 'advanced'

    if (!groupsById[canonicalId]) {
      groupsById[canonicalId] = { canonicalId, basicId: '', advancedIds: [] }
    }

    const group = groupsById[canonicalId]
    if (isAdvanced) {
      group.advancedIds.push(sb.id)
    } else {
      group.basicId = sb.id
    }

    canonicalIdBySubBlockId[sb.id] = canonicalId
  }

  return { groupsById, canonicalIdBySubBlockId }
}

/**
 * Resolve the dependency value for a dependsOn key, honoring canonical swaps.
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

/** Returns true if a sub-block should be visible given current values */
export function isSubBlockVisible(
  _blockType: string,
  _subBlockId: string,
  _currentValues: Record<string, unknown>
): boolean {
  return true
}

/** Returns true if a sub-block should be hidden because it requires a hosted key */
export function isSubBlockHiddenByHostedKey(
  _subBlockIdOrConfig: unknown,
  _isHostedEnv?: boolean
): boolean {
  return false
}

/** Evaluate a SubBlockCondition against current values */
export function evaluateSubBlockCondition(
  _condition: SubBlockCondition | undefined,
  _values: Record<string, unknown>
): boolean {
  return true
}

/** Build a values record from subblock configs (Phase 4 stub) */
export function buildSubBlockValues(
  _subBlocks: SubBlockConfig[] | Record<string, unknown>,
  _overrides?: Record<string, unknown>
): Record<string, unknown> {
  return {}
}

/** Check if a value is non-empty (not null/undefined/empty string) */
export function isNonEmptyValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== ''
}

/** Check if a subblock feature flag is enabled (Phase 4 stub — always true) */
export function isSubBlockFeatureEnabled(
  _subBlockIdOrConfig: unknown,
  _featureFlag?: string
): boolean {
  return true
}

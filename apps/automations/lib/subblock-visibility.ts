/**
 * Re-export from canonical location.
 */
export {
  buildCanonicalIndex,
  buildDefaultCanonicalModes,
  buildSubBlockValues,
  evaluateSubBlockCondition,
  getCanonicalValues,
  hasAdvancedValues,
  hasStandaloneAdvancedFields,
  isCanonicalPair,
  isNonEmptyValue,
  isSubBlockFeatureEnabled,
  isSubBlockHiddenByHostedKey,
  isSubBlockVisibleForMode,
  resolveCanonicalMode,
  resolveDependencyValue,
} from '@/lib/workflows/subblocks/visibility'

export type {
  CanonicalGroup,
  CanonicalIndex,
  CanonicalMode,
  CanonicalModeOverrides,
  CanonicalValueSelection,
  SubBlockCondition,
} from '@/lib/workflows/subblocks/visibility'

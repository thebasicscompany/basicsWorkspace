export interface CanonicalIndex { groupsById: Record<string, any>; canonicalIdBySubBlockId: Record<string, string> }
export type CanonicalModeOverrides = Record<string, string>
export interface SubBlockCondition { field: string; operator: string; value: any }
export function buildCanonicalIndex(_subBlocks: any[]): CanonicalIndex { return { groupsById: {}, canonicalIdBySubBlockId: {} } }
export function buildPreviewContextValues(_blockId: string, _values: any): Record<string, any> { return {} }
export function evaluateSubBlockCondition(_condition: SubBlockCondition, _values: any): boolean { return true }
export function isCanonicalPair(_a: string, _b: string, _index: CanonicalIndex): boolean { return false }
export function resolveCanonicalMode(_group: any, _values: any, _overrides?: any): string { return 'basic' }

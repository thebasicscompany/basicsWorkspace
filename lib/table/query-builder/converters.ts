// Phase 4 stub — table query builder converters
import type { Filter, Sort } from '@/lib/table/types'

export function convertFilterToSQL(_filter: unknown): string {
  return '1=1'
}

export function convertSortToSQL(_sort: unknown): string {
  return ''
}

/** Convert filter rule objects to Filter type for table queries */
export function filterRulesToFilter(_rules: unknown[]): Filter[] {
  return []
}

/** Convert sort rule objects to Sort type for table queries */
export function sortRulesToSort(_rules: unknown[]): Sort[] {
  return []
}

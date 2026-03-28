/**
 * Selector query hooks — stubs for OAuth credential/resource selectors.
 * These will query the gateway for available credentials/resources.
 * Stubbed with empty data until gateway OAuth integration is built.
 */
import type { SelectorContext, SelectorKey, SelectorOption } from './types'

export function useSelectorOptions(
  _key: SelectorKey | null,
  _opts?: { context?: SelectorContext; search?: string }
): { data: SelectorOption[]; isLoading: boolean; error: Error | null } {
  return { data: [], isLoading: false, error: null }
}

export function useSelectorOptionDetail(
  _key: SelectorKey | null,
  _opts?: { context?: SelectorContext; detailId?: string }
): { data: SelectorOption | null } {
  return { data: null }
}

export function useSelectorOptionMap(
  options: SelectorOption[],
  detailOption?: SelectorOption
): Map<string, SelectorOption> {
  const map = new Map<string, SelectorOption>()
  for (const opt of options) {
    map.set(opt.id, opt)
  }
  if (detailOption) {
    map.set(detailOption.id, detailOption)
  }
  return map
}

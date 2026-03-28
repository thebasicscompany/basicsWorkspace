/**
 * Selector context field mapping.
 * Copied from Sim's lib/workflows/subblocks/context.ts
 * Maps canonicalParamId values to SelectorContext field names.
 */
import type { SelectorContext } from '@/hooks/selectors/types'

export const SELECTOR_CONTEXT_FIELDS = new Set<keyof SelectorContext>([
  'siteId',
  'teamId',
  'oauthCredential',
  'mimeType',
])

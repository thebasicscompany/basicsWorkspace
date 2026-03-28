/**
 * Selector types — stub for OAuth credential/resource selector infrastructure.
 * Will be wired to gateway when OAuth credential management is implemented.
 */

export type SelectorKey = string

export interface SelectorContext {
  workflowId?: string
  mimeType?: string
  siteId?: string
  teamId?: string
  oauthCredential?: string
  [key: string]: string | undefined
}

export interface SelectorOption {
  id: string
  label: string
  description?: string
}

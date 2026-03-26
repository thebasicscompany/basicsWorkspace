// Phase 3E stub — OAuth bare import re-export
export * from './oauth/utils'

/** Identifies a supported OAuth service provider */
export type OAuthService =
  | 'google'
  | 'github'
  | 'slack'
  | 'notion'
  | 'airtable'
  | 'hubspot'
  | 'salesforce'
  | 'microsoft'
  | 'dropbox'
  | 'linear'
  | string

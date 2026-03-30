// Phase 3E stub — OAuth bare import re-export
export * from './oauth/utils'

export type OAuthProvider = string

export function getProviderIdFromServiceId(serviceId: string): string { return serviceId }

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

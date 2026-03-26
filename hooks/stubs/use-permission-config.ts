/**
 * Stub for usePermissionConfig.
 * Returns fully permissive defaults — no access control.
 * Matches Sim's PermissionConfigResult interface.
 */
import { useMemo } from 'react'

export interface PermissionConfigResult {
  config: any
  isLoading: boolean
  isInPermissionGroup: boolean
  filterBlocks: <T extends { type: string }>(blocks: T[]) => T[]
  filterProviders: (providerIds: string[]) => string[]
  isBlockAllowed: (blockType: string) => boolean
  isProviderAllowed: (providerId: string) => boolean
  isInvitationsDisabled: boolean
  isPublicApiDisabled: boolean
}

export function usePermissionConfig(): PermissionConfigResult {
  return useMemo(() => ({
    config: {
      allowedIntegrations: null,
      allowedModelProviders: null,
      disableInvitations: false,
      disablePublicApi: false,
    },
    isLoading: false,
    isInPermissionGroup: false,
    filterBlocks: <T extends { type: string }>(blocks: T[]): T[] => blocks,
    filterProviders: (providerIds: string[]): string[] => providerIds,
    isBlockAllowed: (_blockType: string) => true,
    isProviderAllowed: (_providerId: string) => true,
    isInvitationsDisabled: false,
    isPublicApiDisabled: false,
  }), [])
}

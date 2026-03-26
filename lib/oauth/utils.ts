/**
 * Phase 3E stub — OAuth credential utilities for blocks.
 * Real implementation wires to gateway's /v1/connections in Phase 3E.
 */

export interface OAuthCredential {
  id: string
  provider: string
  name: string
  isConnected: boolean
}

/** Returns credentials for a provider that the org has connected. */
export async function getOAuthCredentials(
  _provider: string,
  _orgId?: string
): Promise<OAuthCredential[]> {
  return []
}

/** Checks if a given credential ID is valid and connected. */
export async function validateCredential(
  _credentialId: string,
  _orgId?: string
): Promise<boolean> {
  return false
}

/** Returns required OAuth scopes for a given service. Phase 3E wires real data. */
export function getScopesForService(_service: string): string[] {
  return []
}

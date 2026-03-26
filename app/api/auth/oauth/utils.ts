/**
 * Phase 4 stub — OAuth account resolution for Vertex AI credentials.
 * Vertex AI BYOK support is Phase 4; all LLM calls go through gateway in Phase 3.
 */

export async function resolveOAuthAccountId(
  _credentialId: string
): Promise<{ accountId: string } | null> {
  return null
}

/** Refresh an OAuth token if it's expired or near expiry (Phase 4 stub) */
export async function refreshTokenIfNeeded(
  _credentialId: string,
  _credentialOrOrgId?: unknown,
  _accountId?: string
): Promise<{ accessToken: string; expiresAt?: number }> {
  return { accessToken: '' }
}

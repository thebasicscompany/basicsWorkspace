// Phase 4 stub — credential access authorization
// Will verify that the requesting user/workflow has permission to use a given OAuth credential

import type { NextRequest } from 'next/server'

export interface CredentialUseOptions {
  credentialId: string
  workflowId?: string
}

export interface CredentialUseResult {
  ok: boolean
  error?: string
  credentialOwnerUserId?: string
}

/**
 * Authorize use of an OAuth credential.
 * Phase 4 stub: looks up the credential's owner from the account table and permits access.
 */
export async function authorizeCredentialUse(
  _request: NextRequest,
  options: CredentialUseOptions
): Promise<CredentialUseResult> {
  // Phase 4 stub — in single-tenant mode, allow all credential access
  // and return a placeholder owner ID. The caller will use this to refresh tokens.
  const { db } = await import('@/lib/db')
  const { account } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  try {
    const rows = await db
      .select({ userId: account.userId })
      .from(account)
      .where(eq(account.id, options.credentialId))
      .limit(1)

    if (!rows.length) {
      return { ok: false, error: 'Credential not found' }
    }

    return {
      ok: true,
      credentialOwnerUserId: rows[0].userId,
    }
  } catch {
    return { ok: false, error: 'Failed to look up credential' }
  }
}

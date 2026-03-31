import { SignJWT, jwtVerify } from 'jose'

/**
 * Internal service-to-service authentication.
 * Used by the executor when making internal API calls (e.g., fetching OAuth tokens).
 *
 * Uses INTERNAL_API_SECRET env var for JWT signing. Falls back to BETTER_AUTH_SECRET
 * if INTERNAL_API_SECRET is not set (dev convenience).
 */

function getJwtSecret(): Uint8Array {
  const secret = process.env.INTERNAL_API_SECRET || process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error(
      'INTERNAL_API_SECRET (or BETTER_AUTH_SECRET) must be set for internal auth'
    )
  }
  return new TextEncoder().encode(secret)
}

/**
 * Generate a short-lived internal JWT token for server-side API calls.
 * Token expires in 5 minutes.
 * @param userId Optional user ID to embed in the token payload
 */
export async function generateInternalToken(userId?: string): Promise<string> {
  const secret = getJwtSecret()

  const payload: { type: string; userId?: string } = { type: 'internal' }
  if (userId) {
    payload.userId = userId
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .setIssuer('basics-internal')
    .setAudience('basics-api')
    .sign(secret)

  return token
}

/**
 * Verify an internal JWT token.
 * Returns the decoded payload if valid.
 */
export async function verifyInternalToken(
  token: string
): Promise<{ valid: boolean; userId?: string }> {
  try {
    const secret = getJwtSecret()

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'basics-internal',
      audience: 'basics-api',
    })

    if (payload.type === 'internal') {
      return {
        valid: true,
        userId: typeof payload.userId === 'string' ? payload.userId : undefined,
      }
    }

    return { valid: false }
  } catch {
    return { valid: false }
  }
}

/** Build auth headers for internal API calls. */
export async function getInternalAuthHeaders(userId?: string): Promise<Record<string, string>> {
  try {
    const token = await generateInternalToken(userId)
    return { Authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export function buildAuthHeaders(userId?: string): Promise<Record<string, string>> {
  return getInternalAuthHeaders(userId)
}

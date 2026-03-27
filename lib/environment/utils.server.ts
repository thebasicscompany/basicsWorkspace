import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { environment } from '@/lib/db/schema'

/**
 * Loads decrypted environment variables for a user from the database.
 * In production, values should be encrypted at rest — add decryption here.
 * Returns a flat Record<string, string> suitable for the executor.
 */
export async function getEffectiveEnvVars(userId: string): Promise<Record<string, string>> {
  try {
    const result = await db
      .select()
      .from(environment)
      .where(eq(environment.userId, userId))
      .limit(1)

    if (!result.length || !result[0].variables) {
      return {}
    }

    // TODO: In production, decrypt values here
    return result[0].variables as Record<string, string>
  } catch (error) {
    console.error('[EnvironmentUtils] Error loading environment variables:', error)
    return {}
  }
}

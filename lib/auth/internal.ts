/**
 * Phase 4 stub — internal auth header generation.
 * In Phase 3, server-side API calls use service auth headers.
 */
export async function getInternalAuthHeaders(): Promise<Record<string, string>> {
  return {}
}

export function buildAuthHeaders(): Promise<Record<string, string>> {
  return getInternalAuthHeaders()
}

/** Generate a short-lived internal service token (Phase 4 stub — returns empty string). */
export function generateInternalToken(_scope?: string): string {
  return ''
}

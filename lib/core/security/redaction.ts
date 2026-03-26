const API_KEY_PATTERN = /([Aa]uthorization:\s*Bearer\s+|api[_-]?key[=:\s]+)([A-Za-z0-9\-_]{8,})/g

/** Redacts API keys from strings or objects before logging. */
export function redactApiKeys(input: string): string
export function redactApiKeys(input: Record<string, unknown>): Record<string, unknown>
export function redactApiKeys(input: string | Record<string, unknown>): string | Record<string, unknown> {
  if (typeof input === 'string') {
    return input.replace(API_KEY_PATTERN, '$1[REDACTED]')
  }
  // For objects, return as-is (full redaction is Phase 4)
  return input
}

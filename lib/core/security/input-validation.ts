// Phase 4 stub — input validation helpers

export function validateOktaDomain(domain: string): string {
  if (!domain || domain.trim() === '') throw new Error('Okta domain is required')
  return domain.trim()
}

export function validatePathSegment(
  segment: string,
  _options?: { paramName?: string }
): { isValid: boolean; error?: string } {
  if (/[/\\]/.test(segment)) {
    return { isValid: false, error: `Invalid path segment: ${segment}` }
  }
  return { isValid: true }
}

export function validateEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  _paramName?: string
): { isValid: boolean; error?: string } {
  if (!allowed.includes(value as T)) {
    return { isValid: false, error: `Invalid value "${value}". Allowed: ${allowed.join(', ')}` }
  }
  return { isValid: true }
}

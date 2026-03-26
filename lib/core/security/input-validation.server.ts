// Phase 4 stub — server-side URL and DNS validation

export interface UrlValidationResult {
  isValid: boolean
  error?: string
  resolvedIP?: string
}

/**
 * Validates a URL and simulates DNS resolution.
 * In Phase 4 this does real DNS pinning; here it's a lightweight check.
 */
export async function validateUrlWithDNS(
  url: string,
  _context?: string
): Promise<UrlValidationResult> {
  try {
    new URL(url)
    return { isValid: true }
  } catch {
    return { isValid: false, error: `Invalid URL: ${url}` }
  }
}

/** Fetch wrapper that validates the URL before fetching. */
export async function secureFetchWithPinnedIP(
  url: string,
  _resolvedIPOrOptions?: string | RequestInit,
  options?: RequestInit
): Promise<Response> {
  const fetchOptions = typeof _resolvedIPOrOptions === 'object' ? _resolvedIPOrOptions : options
  const validation = await validateUrlWithDNS(url)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }
  return fetch(url, fetchOptions)
}

/** Fetch wrapper with basic validation. */
export async function secureFetchWithValidation(
  url: string,
  options?: RequestInit,
  _urlFieldName?: string
): Promise<Response> {
  const validation = await validateUrlWithDNS(url)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }
  return fetch(url, options)
}

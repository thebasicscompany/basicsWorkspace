// Phase 4 stub — input validation helpers

export function validateOktaDomain(domain: string): string {
  if (!domain || domain.trim() === '') throw new Error('Okta domain is required')
  return domain.trim()
}

export function validatePathSegment(
  segment: string,
  _options?: { paramName?: string; maxLength?: number; customPattern?: RegExp; allowHyphens?: boolean; allowUnderscores?: boolean; allowDots?: boolean }
): { isValid: boolean; error?: string } {
  if (!segment || segment.trim() === '') {
    return { isValid: false, error: `${_options?.paramName || 'segment'} is required` }
  }
  if (_options?.maxLength && segment.length > _options.maxLength) {
    return { isValid: false, error: `${_options?.paramName || 'segment'} exceeds maximum length` }
  }
  if (_options?.customPattern && !_options.customPattern.test(segment)) {
    return { isValid: false, error: `${_options?.paramName || 'segment'} contains invalid characters` }
  }
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

export function validateAlphanumericId(
  value: string | null | undefined,
  paramName = 'ID',
  maxLength = 100
): { isValid: boolean; error?: string; sanitized?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${paramName} is required` }
  }
  if (value.length > maxLength) {
    return { isValid: false, error: `${paramName} exceeds maximum length of ${maxLength}` }
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    return { isValid: false, error: `${paramName} contains invalid characters` }
  }
  return { isValid: true, sanitized: value }
}

export function validateJiraCloudId(
  value: string | null | undefined,
  paramName = 'cloudId'
): { isValid: boolean; error?: string; sanitized?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${paramName} is required` }
  }
  if (value.length > 255) {
    return { isValid: false, error: `${paramName} exceeds maximum length` }
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    return { isValid: false, error: `${paramName} contains invalid characters` }
  }
  return { isValid: true, sanitized: value }
}

export function validateJiraIssueKey(
  value: string | null | undefined,
  paramName = 'issueKey'
): { isValid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${paramName} is required` }
  }
  if (value.length > 100) {
    return { isValid: false, error: `${paramName} exceeds maximum length` }
  }
  if (!/^[A-Z][A-Z0-9_]+-\d+$/.test(value)) {
    return { isValid: false, error: `${paramName} has invalid format` }
  }
  return { isValid: true }
}

export function validateAirtableId(
  value: string | null | undefined,
  prefix: string,
  paramName = 'ID'
): { isValid: boolean; error?: string; sanitized?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${paramName} is required` }
  }
  if (value.length > 100) {
    return { isValid: false, error: `${paramName} exceeds maximum length` }
  }
  if (!/^[a-zA-Z0-9]+$/.test(value)) {
    return { isValid: false, error: `${paramName} contains invalid characters` }
  }
  return { isValid: true, sanitized: value }
}

export function validateNumericId(
  value: number | string | null | undefined,
  paramName = 'ID',
  options?: { min?: number; max?: number }
): { isValid: boolean; error?: string; sanitized?: number } {
  const num = typeof value === 'string' ? Number(value) : value
  if (num === null || num === undefined || isNaN(num as number)) {
    return { isValid: false, error: `${paramName} must be a number` }
  }
  if (options?.min !== undefined && (num as number) < options.min) {
    return { isValid: false, error: `${paramName} must be at least ${options.min}` }
  }
  if (options?.max !== undefined && (num as number) > options.max) {
    return { isValid: false, error: `${paramName} must be at most ${options.max}` }
  }
  return { isValid: true, sanitized: num as number }
}

export function validateMicrosoftGraphId(
  value: string | null | undefined,
  paramName = 'ID'
): { isValid: boolean; error?: string; sanitized?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${paramName} is required` }
  }
  if (value.length > 500) {
    return { isValid: false, error: `${paramName} exceeds maximum length` }
  }
  return { isValid: true, sanitized: value.trim() }
}

export function validateSharePointSiteId(
  value: string | null | undefined,
  paramName = 'siteId'
): { isValid: boolean; error?: string; sanitized?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${paramName} is required` }
  }
  if (value.length > 500) {
    return { isValid: false, error: `${paramName} exceeds maximum length` }
  }
  return { isValid: true, sanitized: value.trim() }
}

export function validateS3BucketName(
  value: string | null | undefined,
  paramName = 'bucket'
): { isValid: boolean; error?: string; sanitized?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${paramName} is required` }
  }
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value)) {
    return { isValid: false, error: `${paramName} has invalid S3 bucket name format` }
  }
  return { isValid: true, sanitized: value }
}

export function validateAwsRegion(
  value: string | null | undefined,
  paramName = 'region'
): { isValid: boolean; error?: string; sanitized?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${paramName} is required` }
  }
  if (!/^[a-z]{2}-[a-z]+-\d{1}$/.test(value)) {
    return { isValid: false, error: `${paramName} has invalid AWS region format` }
  }
  return { isValid: true, sanitized: value }
}

export function validatePaginationCursor(
  value: string | null | undefined,
  paramName = 'cursor'
): { isValid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${paramName} is required` }
  }
  if (value.length > 1000) {
    return { isValid: false, error: `${paramName} exceeds maximum length` }
  }
  return { isValid: true }
}

// Sanitizes block cross-references in workflow configs
export function sanitizeBlockReferences(
  config: Record<string, unknown>,
  validBlockIds: Set<string>
): Record<string, unknown> {
  // Phase 4 implements deep reference validation
  return config
}

/**
 * Heuristic check — returns true if a string segment looks like a variable reference
 * (e.g. `blockName.output`, `$var`, `{{expr}}`).
 * Phase 4 stub always returns false.
 */
export function isLikelyReferenceSegment(_segment: string): boolean {
  return false
}

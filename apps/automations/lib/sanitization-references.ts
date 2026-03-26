/**
 * Sanitization reference utilities — ported from Sim.
 */

export const SYSTEM_REFERENCE_PREFIXES = new Set(['start', 'loop', 'parallel', 'variable'])

/**
 * Checks if a segment is likely a reference (e.g., <blockname.output>)
 */
export function isLikelyReferenceSegment(segment: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(segment)
}

/**
 * Splits a reference tag like "<blockname.output>" into leading text and the reference.
 * Returns null if the segment is not a valid reference.
 */
export function splitReferenceSegment(
  segment: string
): { leading: string; reference: string } | null {
  if (!segment.startsWith('<') || !segment.endsWith('>')) {
    return null
  }

  const lastOpenBracket = segment.lastIndexOf('<')
  if (lastOpenBracket === -1) {
    return null
  }

  const leading = lastOpenBracket > 0 ? segment.slice(0, lastOpenBracket) : ''
  const reference = segment.slice(lastOpenBracket)

  if (!reference.startsWith('<') || !reference.endsWith('>')) {
    return null
  }

  return { leading, reference }
}

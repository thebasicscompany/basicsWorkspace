// Phase 4 stub — Google AI/Gemini response utilities
// Helpers for extracting content and usage metadata from Google GenAI responses

/**
 * Extract text content from a Gemini response candidate.
 */
export function extractTextContent(candidate: any): string {
  if (!candidate?.content?.parts) return ''
  return candidate.content.parts
    .filter((part: any) => part.text)
    .map((part: any) => part.text)
    .join('')
}

/**
 * Convert Google GenAI usage metadata to a normalized format.
 */
export function convertUsageMetadata(
  usageMetadata: any
): {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
} {
  if (!usageMetadata) return {}
  return {
    promptTokenCount: usageMetadata.promptTokenCount,
    candidatesTokenCount: usageMetadata.candidatesTokenCount,
    totalTokenCount: usageMetadata.totalTokenCount,
  }
}

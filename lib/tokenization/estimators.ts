// Phase 4 stub — token counting
// Rough estimate: 1 token ≈ 4 characters
export function getAccurateTokenCount(text: string, _model?: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

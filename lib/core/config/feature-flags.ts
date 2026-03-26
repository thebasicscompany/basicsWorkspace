// Phase 4 stub — feature flags

/** basics-workspace is always "hosted" (not self-hosted open-source). */
export function isHosted(): boolean {
  return true
}

/** Cost multiplier for LLM usage. Gateway handles actual billing; return 1. */
export function getCostMultiplier(): number {
  return 1
}

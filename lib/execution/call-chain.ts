// Phase 4 stub — execution call chain tracking (prevents infinite loops in sub-workflows)

const MAX_CALL_CHAIN_DEPTH = 10

/** Header that carries the call chain between workflow executions */
export const SIM_VIA_HEADER = 'x-sim-via'

/** Serialize a call chain array to a header-safe string */
export function serializeCallChain(chain: string[]): string {
  return chain.join(',')
}

/**
 * Build the next call chain for a sub-workflow invocation.
 * Alias for buildCallChain — matches Sim's executeProviderRequest API.
 */
export function buildNextCallChain(
  parentChain: string[] | undefined,
  workflowId: string
): string[] {
  return [...(parentChain ?? []), workflowId]
}

/**
 * Validate a call chain doesn't exceed max depth or contain cycles.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateCallChain(chain: string[]): string | null {
  if (chain.length >= MAX_CALL_CHAIN_DEPTH) {
    return `Max call chain depth (${MAX_CALL_CHAIN_DEPTH}) exceeded`
  }
  return null
}

/** Deserialize a call chain from a header string */
export function deserializeCallChain(header: string): string[] {
  return header ? header.split(',').filter(Boolean) : []
}

export function buildCallChain(
  parentChain: string[] | undefined,
  workflowId: string
): string[] {
  return [...(parentChain ?? []), workflowId]
}

export function detectCallCycle(
  chain: string[],
  workflowId: string
): boolean {
  return chain.includes(workflowId)
}

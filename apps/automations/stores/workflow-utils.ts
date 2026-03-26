// @ts-nocheck
// Re-export from workflow store for backward compatibility
export * from './workflow'

/** Generate loop subflow block stubs (Phase 3C stub) */
export function generateLoopBlocks(_config: unknown): Record<string, any> {
  return {}
}

/** Generate parallel subflow block stubs (Phase 3C stub) */
export function generateParallelBlocks(_config: unknown): Record<string, any> {
  return {}
}

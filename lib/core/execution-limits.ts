// Execution timeout constants
export const DEFAULT_EXECUTION_TIMEOUT_MS = 300_000 // 5 minutes

export function getMaxExecutionTimeout(): number {
  const override = process.env.MAX_EXECUTION_TIMEOUT_MS
  return override ? parseInt(override, 10) : DEFAULT_EXECUTION_TIMEOUT_MS
}

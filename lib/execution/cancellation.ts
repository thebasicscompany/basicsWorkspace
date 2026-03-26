// Phase 4 stub — execution cancellation (Redis-backed in Sim, not in Phase 3)
export async function checkCancellation(_executionId: string): Promise<boolean> {
  return false
}

export function isRedisCancellationEnabled(): boolean {
  return false
}

export async function isExecutionCancelled(_executionId: string): Promise<boolean> {
  return false
}

export async function cancelExecution(_executionId: string): Promise<void> {}

export async function registerExecution(_executionId: string): Promise<void> {}

export async function unregisterExecution(_executionId: string): Promise<void> {}

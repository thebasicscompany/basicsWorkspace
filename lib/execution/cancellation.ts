/**
 * In-process execution cancellation registry.
 * Adapted from Sim's lib/execution/cancellation.ts and manual-cancellation.ts
 *
 * Sim uses Redis for durable cross-process cancellation. We use an in-memory
 * Map since our executor runs in the same process as the API routes.
 * Can be upgraded to Redis when needed.
 */

const activeExecutions = new Map<string, AbortController>()

/**
 * Register an execution with a cancellation controller.
 * Call this when starting an execution in the run route.
 */
export function registerExecution(executionId: string): AbortController {
  const controller = new AbortController()
  activeExecutions.set(executionId, controller)
  return controller
}

/**
 * Unregister an execution after it completes.
 */
export function unregisterExecution(executionId: string): void {
  activeExecutions.delete(executionId)
}

/**
 * Cancel an in-flight execution by signaling its AbortController.
 * Returns whether the execution was found and cancelled.
 */
export function cancelExecution(executionId: string): {
  cancelled: boolean
  reason: 'aborted' | 'not_found' | 'already_complete'
} {
  const controller = activeExecutions.get(executionId)
  if (!controller) {
    return { cancelled: false, reason: 'not_found' }
  }

  if (controller.signal.aborted) {
    return { cancelled: false, reason: 'already_complete' }
  }

  controller.abort()
  activeExecutions.delete(executionId)
  return { cancelled: true, reason: 'aborted' }
}

/**
 * Check if an execution has been cancelled.
 */
export function isExecutionCancelled(executionId: string): boolean {
  const controller = activeExecutions.get(executionId)
  return controller?.signal.aborted ?? false
}

/** Compat shim — Sim's Redis-based check */
export async function checkCancellation(executionId: string): Promise<boolean> {
  return isExecutionCancelled(executionId)
}

export function isRedisCancellationEnabled(): boolean {
  return false
}

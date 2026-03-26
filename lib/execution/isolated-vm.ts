// Phase 4 stub — isolated VM for safe code execution (function blocks)
export async function runInIsolatedVm(
  _code: string,
  _params: Record<string, unknown>,
  _timeoutMs?: number
): Promise<unknown> {
  // In Phase 3, function blocks run with eval() inside the Node.js process
  // Phase 4 replaces this with true sandboxing via isolated-vm
  throw new Error('Isolated VM not yet implemented — use basic function execution')
}

/** Execute code in an isolated VM environment (Phase 4 stub) */
export async function executeInIsolatedVM(
  _opts: {
    code: string
    params?: Record<string, unknown>
    envVars?: Record<string, string>
    contextVariables?: Record<string, unknown>
    timeoutMs?: number
    requestId?: string
    ownerKey?: string
    ownerWeight?: number
  }
): Promise<{ result: unknown; error?: string; logs?: string[] }> {
  return { result: null, error: 'Isolated VM not yet implemented (Phase 4)' }
}

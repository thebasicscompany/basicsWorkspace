import { NextResponse } from 'next/server'
import { DEFAULT_EXECUTION_TIMEOUT_MS } from '@/lib/execution/constants'

/**
 * POST /api/function/execute
 *
 * Executes user-provided JavaScript code in a basic sandbox.
 * Uses AsyncFunction constructor (not eval) with a timeout wrapper.
 *
 * In production this should use isolated-vm or a container sandbox.
 * For Phase 3 development, this is sufficient for function blocks.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      code,
      timeout = DEFAULT_EXECUTION_TIMEOUT_MS,
      envVars = {},
      blockData = {},
      blockNameMapping = {},
      workflowVariables = {},
    } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No code provided' },
        { status: 400 }
      )
    }

    // Build the execution context
    // Make env vars available as process.env-like object
    const env = { ...envVars }

    // Make block data available for variable resolution
    // The code can reference these via the resolved <block.output> syntax
    const context = {
      env,
      blockData,
      blockNameMapping,
      variables: workflowVariables,
    }

    const logs: string[] = []
    const capturedConsole = {
      log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      warn: (...args: unknown[]) => logs.push(`[warn] ${args.map(String).join(' ')}`),
      error: (...args: unknown[]) => logs.push(`[error] ${args.map(String).join(' ')}`),
      info: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
    }

    // Wrap in async IIFE with timeout
    const wrappedCode = `
      return (async () => {
        ${code}
      })()
    `

    // Create the async function with available globals
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const fn = new AsyncFunction('fetch', 'console', 'env', 'context', wrappedCode)

    // Execute with timeout
    const timeoutMs = Math.min(timeout, DEFAULT_EXECUTION_TIMEOUT_MS)
    const result = await Promise.race([
      fn(globalThis.fetch, capturedConsole, env, context),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])

    return NextResponse.json({
      success: true,
      output: {
        result: result ?? null,
        stdout: logs.join('\n'),
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      output: {
        result: null,
        stdout: '',
      },
      error: error?.message || 'Code execution failed',
    })
  }
}

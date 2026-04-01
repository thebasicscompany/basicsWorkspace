import { NextResponse } from 'next/server'
import { DEFAULT_EXECUTION_TIMEOUT_MS } from '@/lib/execution/constants'
import { normalizeName } from '@/lib/sim/executor/constants'

/**
 * POST /api/function/execute
 *
 * Executes user-provided JavaScript code in a basic sandbox.
 * Uses AsyncFunction constructor (not eval) with a timeout wrapper.
 *
 * Tags like <BlockName.field> are resolved into safe JS variables before execution
 * (copied from Sim's approach). The actual values are passed as variables to the
 * sandbox so there are no string-escaping issues.
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
    const env = { ...envVars }

    // Resolve <BlockName.field> tags and {{ENV_VAR}} references in code.
    // Instead of string-replacing values directly (which breaks on quotes/newlines),
    // we replace each tag with a safe variable name and pass the actual value
    // into the sandbox context — same approach as Sim.
    const contextVariables: Record<string, unknown> = {}
    let resolvedCode = code

    // 1. Resolve <variable.name> workflow variables (Sim pattern — must run before block tags)
    const varPattern = /<variable\.([^<>]+)>/g
    const varMatches = resolvedCode.match(varPattern) || []

    for (const match of varMatches) {
      const variableName = match.slice('<variable.'.length, -1).trim()
      const normalizedVarName = normalizeName(variableName)

      const foundVariable = Object.entries(workflowVariables).find(
        ([, variable]) => {
          const v = variable as Record<string, unknown>
          return normalizeName(String(v.name || '')) === normalizedVarName
        }
      )

      if (foundVariable) {
        const variable = foundVariable[1] as Record<string, unknown>
        let variableValue: unknown = variable.value
        const varType = variable.type === 'string' ? 'plain' : variable.type

        if (variableValue !== undefined && variableValue !== null) {
          if (varType === 'number') variableValue = Number(variableValue)
          else if (varType === 'boolean') {
            variableValue = typeof variableValue === 'boolean'
              ? variableValue
              : String(variableValue).toLowerCase().trim() === 'true'
          } else if (varType === 'json' && typeof variableValue === 'string') {
            try { variableValue = JSON.parse(variableValue) } catch { /* keep as string */ }
          }
        }

        const safeVarName = `__variable_${variableName.replace(/[^a-zA-Z0-9_]/g, '_')}`
        contextVariables[safeVarName] = variableValue
        resolvedCode = resolvedCode.split(match).join(safeVarName)
      }
    }

    // 2. Resolve <BlockName.field> block output tags
    const tagPattern = /<([^<>]+)>/g
    const tagMatches = resolvedCode.match(tagPattern) || []

    for (const match of tagMatches) {
      const tagName = match.slice(1, -1).trim()
      const dotIndex = tagName.indexOf('.')
      if (dotIndex === -1) continue

      const blockName = tagName.substring(0, dotIndex)
      const fieldPath = tagName.substring(dotIndex + 1)

      // Skip special prefixes (loop, parallel — handled by executor at runtime)
      if (['loop', 'parallel', 'variable'].includes(blockName)) continue

      // Look up block ID from name mapping
      const normalizedName = normalizeName(blockName)
      const blockId =
        blockNameMapping[blockName] ||
        blockNameMapping[normalizedName] ||
        Object.entries(blockNameMapping).find(
          ([, id]) => normalizeName(id as string) === normalizedName
        )?.[1]

      if (!blockId) continue

      // Get the value from blockData — support nested paths (e.g. <Block.field.subfield>)
      const blockOutput = blockData[blockId as string] as Record<string, unknown> | undefined
      if (!blockOutput) continue

      let value: unknown = blockOutput
      for (const part of fieldPath.split('.')) {
        if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
          value = (value as Record<string, unknown>)[part]
        } else {
          value = undefined
          break
        }
      }

      // Try to parse JSON strings
      if (typeof value === 'string') {
        const trimmed = value.trimStart()
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try { value = JSON.parse(value) } catch { /* keep as string */ }
        }
      }

      const safeVarName = `__tag_${tagName.replace(/[^a-zA-Z0-9]/g, '_')}`
      contextVariables[safeVarName] = value ?? undefined
      resolvedCode = resolvedCode.split(match).join(safeVarName)
    }

    // 3. Resolve {{ENV_VAR}} references
    const envPattern = /\{\{([^}]+)\}\}/g
    const envMatches = resolvedCode.match(envPattern) || []

    for (const match of envMatches) {
      const varName = match.slice(2, -2).trim()
      const value = envVars[varName] ?? ''
      const safeVarName = `__env_${varName.replace(/[^a-zA-Z0-9]/g, '_')}`
      contextVariables[safeVarName] = value
      resolvedCode = resolvedCode.split(match).join(safeVarName)
    }

    const logs: string[] = []
    const capturedConsole = {
      log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      warn: (...args: unknown[]) => logs.push(`[warn] ${args.map(String).join(' ')}`),
      error: (...args: unknown[]) => logs.push(`[error] ${args.map(String).join(' ')}`),
      info: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
    }

    // Build variable declarations for all resolved tags/env vars
    const varDeclarations = Object.entries(contextVariables)
      .map(([name]) => `const ${name} = __ctx["${name}"];`)
      .join('\n')

    // Wrap in async IIFE with timeout
    const wrappedCode = `
      return (async () => {
        ${varDeclarations}
        ${resolvedCode}
      })()
    `

    // Create the async function with available globals
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const fn = new AsyncFunction('fetch', 'console', 'env', 'context', '__ctx', wrappedCode)

    // Execute with timeout
    const timeoutMs = Math.min(timeout, DEFAULT_EXECUTION_TIMEOUT_MS)
    const context = {
      env,
      blockData,
      blockNameMapping,
      variables: workflowVariables,
    }

    const result = await Promise.race([
      fn(globalThis.fetch, capturedConsole, env, context, contextVariables),
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

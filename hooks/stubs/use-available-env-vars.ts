/**
 * Stub for useAvailableEnvVarKeys.
 * Returns empty set until we build env var management.
 * Wire to real env var API when available.
 */
import { useMemo } from 'react'

export function useAvailableEnvVarKeys(_workspaceId?: string): Set<string> | undefined {
  return useMemo(() => new Set<string>(), [])
}

export function createShouldHighlightEnvVar(
  availableEnvVars: Set<string> | undefined
): (varName: string) => boolean {
  return (varName: string): boolean => {
    if (availableEnvVars === undefined) return true
    return availableEnvVars.has(varName)
  }
}

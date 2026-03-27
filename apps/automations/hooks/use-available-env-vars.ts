import { useMemo } from 'react'
import { useEnvironmentStore } from '@/apps/automations/stores/settings/environment'

/**
 * Returns the set of available environment variable keys.
 * Used by the env var dropdown to highlight valid references.
 */
export function useAvailableEnvVarKeys(): Set<string> | undefined {
  const variables = useEnvironmentStore((s) => s.variables)
  const isLoading = useEnvironmentStore((s) => s.isLoading)

  return useMemo(() => {
    if (isLoading) return undefined

    const keys = new Set<string>()
    if (variables) {
      Object.keys(variables).forEach((key) => keys.add(key))
    }
    return keys
  }, [variables, isLoading])
}

/**
 * Creates a validator function that checks if an env var name is available.
 */
export function createShouldHighlightEnvVar(
  availableEnvVars: Set<string> | undefined
): (varName: string) => boolean {
  return (varName: string): boolean => {
    if (availableEnvVars === undefined) {
      return true
    }
    return availableEnvVars.has(varName)
  }
}

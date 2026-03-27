import type { EnvironmentVariable } from '@/apps/automations/stores/settings/environment/types'

export interface WorkspaceEnvironmentData {
  workspace: Record<string, string>
  personal: Record<string, string>
  conflicts: string[]
}

export async function fetchPersonalEnvironment(
  signal?: AbortSignal
): Promise<Record<string, EnvironmentVariable>> {
  const response = await fetch('/api/environment', { signal })

  if (!response.ok) {
    await response.text().catch(() => {})
    throw new Error(`Failed to load environment variables: ${response.statusText}`)
  }

  const { data } = await response.json()

  if (data && typeof data === 'object') {
    return data
  }

  return {}
}

export async function savePersonalEnvironment(
  variables: Record<string, string>
): Promise<void> {
  const response = await fetch('/api/environment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variables }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to save environment variables: ${response.statusText}`)
  }
}

// Stub for workspace env — no workspace-level env vars yet
export async function fetchWorkspaceEnvironment(
  _workspaceId: string,
  _signal?: AbortSignal
): Promise<WorkspaceEnvironmentData> {
  return {
    workspace: {},
    personal: {},
    conflicts: [],
  }
}

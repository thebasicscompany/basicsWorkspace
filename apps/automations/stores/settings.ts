/**
 * Phase 4 stub — environment/settings store.
 * Phase 3A.3 (Settings page) manages these via API; this store
 * provides client-side access for blocks that read env vars.
 */
import { create } from 'zustand'

interface SettingsState {
  environmentVariables: Record<string, string>
  setEnvironmentVariables: (vars: Record<string, string>) => void
}

export const useEnvironmentStore = create<SettingsState>((set) => ({
  environmentVariables: {},
  setEnvironmentVariables: (vars) => set({ environmentVariables: vars }),
}))

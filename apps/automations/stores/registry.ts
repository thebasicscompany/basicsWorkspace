/**
 * Phase 3B stub — workflow registry store.
 * Real implementation added in Phase 3B with full list + CRUD.
 */
import { create } from 'zustand'

interface WorkflowSummary {
  id: string
  name: string
  description?: string
  isDeployed: boolean
  runCount: number
  lastRunAt?: string
  updatedAt: string
}

interface RegistryState {
  activeWorkflowId: string | null
  workflows: WorkflowSummary[]
  isLoading: boolean
  error: string | null
  fetchWorkflows: () => Promise<void>
}

export const useWorkflowRegistry = create<RegistryState>((set) => ({
  workflows: [],
  activeWorkflowId: null,
  isLoading: false,
  error: null,
  fetchWorkflows: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/workflows')
      const data = await res.json()
      set({ workflows: data.workflows ?? [], isLoading: false })
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },
}))

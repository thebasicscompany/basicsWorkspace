/**
 * Stub for workflow diff store.
 * In Sim this powers version comparison UI.
 * We don't have versioning yet — always returns "no diff active".
 */
import { create } from 'zustand'

interface WorkflowDiffState {
  isShowingDiff: boolean
  hasActiveDiff: boolean
  baselineWorkflow: any | null
}

export const useWorkflowDiffStore = create<WorkflowDiffState>(() => ({
  isShowingDiff: false,
  hasActiveDiff: false,
  baselineWorkflow: null,
}))

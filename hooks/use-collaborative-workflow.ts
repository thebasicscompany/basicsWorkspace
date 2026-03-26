/**
 * Stub for useCollaborativeWorkflow.
 * In Sim this manages socket-based collaborative editing.
 * We don't have multi-user yet, so all ops go straight to local stores.
 */
import { useCallback } from 'react'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'
import { useWorkflowRegistry } from '@/apps/automations/stores/registry'

export function useCollaborativeWorkflow() {
  const collaborativeSetSubblockValue = useCallback(
    (blockId: string, subBlockId: string, value: any) => {
      useSubBlockStore.getState().setValue(blockId, subBlockId, value)
    },
    []
  )

  const collaborativeSetTagSelection = useCallback(
    (blockId: string, subBlockId: string, value: any) => {
      useSubBlockStore.getState().setValue(blockId, subBlockId, value)
    },
    []
  )

  return {
    collaborativeSetSubblockValue,
    collaborativeSetTagSelection,
  }
}

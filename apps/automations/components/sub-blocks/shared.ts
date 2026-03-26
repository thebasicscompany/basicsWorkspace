import { useCallback } from 'react'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'
import { useWorkflowRegistry } from '@/apps/automations/stores/registry'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'

// ─── Shared styles for all sub-block inputs ─────────────────────────────────

export const baseInputClass =
  'w-full text-xs rounded-lg px-2.5 py-1.5 outline-none transition-colors focus:ring-1 focus:ring-[var(--color-accent)]'

export const baseStyle: React.CSSProperties = {
  background: 'var(--color-bg-base)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
}

// ─── Common props for all sub-block input components ─────────────────────────

export interface SubBlockInputProps {
  blockId: string
  config: SubBlockConfig
  value: any
  onChange: (value: any) => void
}

// ─── Hook to read/write a subblock value from the store ──────────────────────

export function useSubBlockValue(blockId: string, subBlockId: string) {
  const value = useSubBlockStore((s) => {
    const wfId = useWorkflowRegistry.getState().activeWorkflowId
    if (!wfId) return null
    return s.workflowValues[wfId]?.[blockId]?.[subBlockId] ?? null
  })

  const setValue = useCallback(
    (val: any) => useSubBlockStore.getState().setValue(blockId, subBlockId, val),
    [blockId, subBlockId]
  )

  return [value, setValue] as const
}

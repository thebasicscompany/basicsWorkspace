/**
 * Workflow registry store — manages workflow list, active workflow, and clipboard.
 * Clipboard support copied from Sim's stores/workflows/registry/store.ts.
 */
import type { Edge } from 'reactflow'
import { create } from 'zustand'
import { useWorkflowStore } from '@/apps/automations/stores/workflow'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'
import {
  type BlockState,
  getUniqueBlockName,
  regenerateBlockIds,
} from '@/apps/automations/stores/workflows/utils'

const DEFAULT_DUPLICATE_OFFSET = { x: 50, y: 50 }

interface ClipboardData {
  blocks: Record<string, BlockState>
  edges: Edge[]
  subBlockValues: Record<string, Record<string, unknown>>
  loops: Record<string, any>
  parallels: Record<string, any>
  timestamp: number
}

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
  clipboard: ClipboardData | null
  pendingSelection: string[] | null
  fetchWorkflows: () => Promise<void>
  copyBlocks: (blockIds: string[]) => void
  preparePasteData: (positionOffset?: { x: number; y: number }) => {
    blocks: Record<string, BlockState>
    edges: Edge[]
    loops: Record<string, any>
    parallels: Record<string, any>
    subBlockValues: Record<string, Record<string, unknown>>
  } | null
  hasClipboard: () => boolean
  clearClipboard: () => void
  setPendingSelection: (blockIds: string[]) => void
  clearPendingSelection: () => void
}

export const useWorkflowRegistry = create<RegistryState>((set, get) => ({
  workflows: [],
  activeWorkflowId: null,
  isLoading: false,
  error: null,
  clipboard: null,
  pendingSelection: null,

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

  copyBlocks: (blockIds: string[]) => {
    if (blockIds.length === 0) return

    const workflowStore = useWorkflowStore.getState()
    const activeWorkflowId = get().activeWorkflowId
    const subBlockStore = useSubBlockStore.getState()

    const copiedBlocks: Record<string, BlockState> = {}
    const copiedSubBlockValues: Record<string, Record<string, unknown>> = {}
    const blockIdSet = new Set(blockIds)

    blockIdSet.forEach((blockId) => {
      const block = workflowStore.blocks[blockId]
      if (block) {
        copiedBlocks[blockId] = JSON.parse(JSON.stringify(block))
        if (activeWorkflowId) {
          const blockValues = subBlockStore.workflowValues[activeWorkflowId]?.[blockId]
          if (blockValues) {
            copiedSubBlockValues[blockId] = JSON.parse(JSON.stringify(blockValues))
          }
        }
      }
    })

    const copiedEdges = workflowStore.edges.filter(
      (edge) => blockIdSet.has(edge.source) && blockIdSet.has(edge.target)
    )

    set({
      clipboard: {
        blocks: copiedBlocks,
        edges: copiedEdges,
        subBlockValues: copiedSubBlockValues,
        loops: {},
        parallels: {},
        timestamp: Date.now(),
      },
    })
  },

  preparePasteData: (positionOffset = DEFAULT_DUPLICATE_OFFSET) => {
    const { clipboard, activeWorkflowId } = get()
    if (!clipboard || Object.keys(clipboard.blocks).length === 0) return null
    if (!activeWorkflowId) return null

    const workflowStore = useWorkflowStore.getState()
    const { blocks, edges, loops, parallels, subBlockValues } = regenerateBlockIds(
      clipboard.blocks,
      clipboard.edges,
      clipboard.loops,
      clipboard.parallels,
      clipboard.subBlockValues,
      positionOffset,
      workflowStore.blocks as any,
      getUniqueBlockName
    )

    return { blocks, edges, loops, parallels, subBlockValues }
  },

  hasClipboard: () => {
    const { clipboard } = get()
    return clipboard !== null && Object.keys(clipboard.blocks).length > 0
  },

  clearClipboard: () => {
    set({ clipboard: null })
  },

  setPendingSelection: (blockIds: string[]) => {
    set((state) => ({
      pendingSelection: [...(state.pendingSelection ?? []), ...blockIds],
    }))
  },

  clearPendingSelection: () => {
    set({ pendingSelection: null })
  },
}))

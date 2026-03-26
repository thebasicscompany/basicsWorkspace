import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { BlockPathCalculator } from '@/apps/automations/lib/block-path-calculator'
import { normalizeName } from '@/lib/sim/executor/constants'
import { useWorkflowStore } from '@/apps/automations/stores/workflow'
import type { Loop, Parallel } from '@/apps/automations/stores/workflow-types'

const SYSTEM_REFERENCE_PREFIXES = new Set(['start', 'loop', 'parallel', 'variable'])

export function useAccessibleReferencePrefixes(blockId?: string | null): Set<string> | undefined {
  const { blocks, edges, loops, parallels } = useWorkflowStore(
    useShallow((state: any) => ({
      blocks: state.blocks,
      edges: state.edges,
      loops: state.loops || {},
      parallels: state.parallels || {},
    }))
  )

  return useMemo(() => {
    if (!blockId) {
      return undefined
    }

    const graphEdges = edges.map((edge: any) => ({ source: edge.source, target: edge.target }))
    const ancestorIds = BlockPathCalculator.findAllPathNodes(graphEdges, blockId)
    const accessibleIds = new Set<string>(ancestorIds)
    accessibleIds.add(blockId)

    Object.values(loops as Record<string, Loop>).forEach((loop) => {
      if (loop?.nodes?.includes(blockId)) accessibleIds.add(loop.id)
    })

    Object.values(parallels as Record<string, Parallel>).forEach((parallel) => {
      if (parallel?.nodes?.includes(blockId)) accessibleIds.add(parallel.id)
    })

    const prefixes = new Set<string>()
    accessibleIds.forEach((id) => {
      prefixes.add(normalizeName(id))
      const block = blocks[id]
      if (block?.name) {
        prefixes.add(normalizeName(block.name))
      }
    })

    SYSTEM_REFERENCE_PREFIXES.forEach((prefix) => prefixes.add(prefix))

    return prefixes
  }, [blockId, blocks, edges, loops, parallels])
}

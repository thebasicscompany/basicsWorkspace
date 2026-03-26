// @ts-nocheck
// Re-export from workflow store for backward compatibility
export * from './workflow'

import type { Loop, Parallel } from '@/apps/automations/stores/workflow-types'

const DEFAULT_LOOP_ITERATIONS = 10

/**
 * Find all nodes that are direct children of a container (loop or parallel)
 */
function findChildNodes(containerId: string, blocks: Record<string, any>): string[] {
  return Object.values(blocks)
    .filter((block: any) => block.data?.parentId === containerId)
    .map((block: any) => block.id)
}

/**
 * Find all descendant nodes recursively
 */
export function findAllDescendantNodes(containerId: string, blocks: Record<string, any>): string[] {
  const children = findChildNodes(containerId, blocks)
  const allDescendants = [...children]
  for (const childId of children) {
    allDescendants.push(...findAllDescendantNodes(childId, blocks))
  }
  return allDescendants
}

/**
 * Convert UI loop block to executor Loop format
 */
function convertLoopBlockToLoop(
  loopBlockId: string,
  blocks: Record<string, any>
): Loop | undefined {
  const loopBlock = blocks[loopBlockId]
  if (!loopBlock || loopBlock.type !== 'loop') return undefined

  const loopType = loopBlock.data?.loopType || 'for'

  const loop: Loop = {
    id: loopBlockId,
    nodes: findChildNodes(loopBlockId, blocks),
    iterations: loopBlock.data?.count || DEFAULT_LOOP_ITERATIONS,
    loopType,
    enabled: loopBlock.enabled,
  }

  loop.forEachItems = loopBlock.data?.collection || ''
  loop.whileCondition = loopBlock.data?.whileCondition || ''
  loop.doWhileCondition = loopBlock.data?.doWhileCondition || ''

  return loop
}

/**
 * Convert UI parallel block to executor Parallel format
 */
function convertParallelBlockToParallel(
  parallelBlockId: string,
  blocks: Record<string, any>
): Parallel | undefined {
  const parallelBlock = blocks[parallelBlockId]
  if (!parallelBlock || parallelBlock.type !== 'parallel') return undefined

  const parallelType = parallelBlock.data?.parallelType || 'count'
  const validParallelTypes = ['collection', 'count'] as const
  const validatedParallelType = validParallelTypes.includes(parallelType as any)
    ? parallelType
    : 'collection'

  const distribution =
    validatedParallelType === 'collection' ? parallelBlock.data?.collection || '' : undefined
  const count = parallelBlock.data?.count || 5

  return {
    id: parallelBlockId,
    nodes: findChildNodes(parallelBlockId, blocks),
    distribution,
    count,
    parallelType: validatedParallelType,
    enabled: parallelBlock.enabled,
  }
}

/**
 * Generate loop subflow configurations from blocks
 */
export function generateLoopBlocks(blocks: Record<string, any>): Record<string, Loop> {
  const loops: Record<string, Loop> = {}

  Object.entries(blocks)
    .filter(([_, block]) => block.type === 'loop')
    .forEach(([id, _block]) => {
      const loop = convertLoopBlockToLoop(id, blocks)
      if (loop) loops[id] = loop
    })

  return loops
}

/**
 * Generate parallel subflow configurations from blocks
 */
/**
 * Checks if a block is protected (start/response blocks can't be deleted)
 */
export function isBlockProtected(blockType: string): boolean {
  return blockType === 'starter' || blockType === 'response'
}

/**
 * Checks if adding an edge would create a cycle in the workflow graph
 */
export function wouldCreateCycle(
  source: string,
  target: string,
  edges: Array<{ source: string; target: string }>
): boolean {
  const visited = new Set<string>()
  const stack = [target]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node === source) return true
    if (visited.has(node)) continue
    visited.add(node)
    for (const edge of edges) {
      if (edge.source === node) stack.push(edge.target)
    }
  }
  return false
}

export function generateParallelBlocks(blocks: Record<string, any>): Record<string, Parallel> {
  const parallels: Record<string, Parallel> = {}

  Object.entries(blocks)
    .filter(([_, block]) => block.type === 'parallel')
    .forEach(([id, _block]) => {
      const parallel = convertParallelBlockToParallel(id, blocks)
      if (parallel) parallels[id] = parallel
    })

  return parallels
}

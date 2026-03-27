import type { Edge } from 'reactflow'
import { isAnnotationOnlyBlock } from '@/lib/sim/executor/constants'
import type { BlockState } from '@/apps/automations/stores/workflow-types'

export interface DroppedEdge {
  edge: Edge
  reason: string
}

export interface EdgeValidationResult {
  valid: Edge[]
  dropped: DroppedEdge[]
}

function isContainerBlock(block: BlockState | undefined): boolean {
  return block?.type === 'loop' || block?.type === 'parallel'
}

function getParentId(block: BlockState | undefined): string | null {
  return (block?.data as any)?.parentId ?? null
}

function getScopeDropReason(edge: Edge, blocks: Record<string, BlockState>): string | null {
  const sourceBlock = blocks[edge.source]
  const targetBlock = blocks[edge.target]

  if (!sourceBlock || !targetBlock) {
    return 'edge references a missing block'
  }

  const sourceParent = getParentId(sourceBlock)
  const targetParent = getParentId(targetBlock)

  if (sourceParent === targetParent) {
    return null
  }

  if (targetParent === edge.source && isContainerBlock(sourceBlock)) {
    return null
  }

  if (sourceParent === edge.target && isContainerBlock(targetBlock)) {
    return null
  }

  return `blocks are in different scopes (${sourceParent ?? 'root'} -> ${targetParent ?? 'root'})`
}

/**
 * Validates edges against the current block graph.
 * Copied from Sim's stores/workflows/workflow/edge-validation.ts.
 */
export function validateEdges(
  edges: Edge[],
  blocks: Record<string, BlockState>
): EdgeValidationResult {
  const valid: Edge[] = []
  const dropped: DroppedEdge[] = []

  // Import trigger check inline to avoid circular dependency
  const TRIGGER_TYPES_SET = new Set([
    'genericWebhook', 'schedule', 'api', 'webhook', 'manual',
    'github', 'slack', 'stripe', 'gmail', 'calendly', 'telegram',
    'hubspot', 'jira', 'linear', 'airtable', 'typeform', 'twilio_voice',
    'whatsapp', 'rss', 'imap', 'outlook', 'googleforms', 'calcom',
    'confluence', 'microsoftteams', 'ashby', 'attio', 'webflow',
    'fathom', 'fireflies', 'grain', 'circleback', 'lemlist',
  ])
  function isTriggerBlockType(type: string): boolean {
    return type === 'starter' || TRIGGER_TYPES_SET.has(type)
  }

  for (const edge of edges) {
    const sourceBlock = blocks[edge.source]
    const targetBlock = blocks[edge.target]

    if (!sourceBlock || !targetBlock) {
      dropped.push({ edge, reason: 'edge references a missing block' })
      continue
    }

    if (isAnnotationOnlyBlock(sourceBlock.type) || isAnnotationOnlyBlock(targetBlock.type)) {
      dropped.push({ edge, reason: 'edge references an annotation-only block' })
      continue
    }

    if (isTriggerBlockType(targetBlock.type)) {
      dropped.push({ edge, reason: 'trigger blocks cannot be edge targets' })
      continue
    }

    const scopeDropReason = getScopeDropReason(edge, blocks)
    if (scopeDropReason) {
      dropped.push({ edge, reason: scopeDropReason })
      continue
    }

    valid.push(edge)
  }

  return { valid, dropped }
}

/**
 * Checks if adding an edge would create a cycle in the workflow graph.
 */
export function wouldCreateCycle(
  source: string,
  target: string,
  edges: Edge[]
): boolean {
  // BFS from target — if we can reach source, it's a cycle
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const list = adjacency.get(edge.source) ?? []
    list.push(edge.target)
    adjacency.set(edge.source, list)
  }

  const visited = new Set<string>()
  const queue = [target]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === source) return true
    if (visited.has(current)) continue
    visited.add(current)

    const neighbors = adjacency.get(current) ?? []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor)
      }
    }
  }

  return false
}

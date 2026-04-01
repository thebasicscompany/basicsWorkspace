/**
 * Workflow context serializer for the copilot system prompt.
 * Builds a compact representation of the current workflow state + available blocks
 * that the LLM can use to understand and modify workflows.
 */
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workflowBlocks, workflowEdges } from '@/lib/db/schema/workflows'
import { getAllBlocks, getBlock } from '@/lib/sim/blocks/registry'

/**
 * Load the current workflow state from DB and serialize it for the LLM
 */
export async function loadWorkflowStateForCopilot(workflowId: string): Promise<{
  blocks: Record<string, any>
  edges: any[]
  loops: Record<string, any>
  parallels: Record<string, any>
}> {
  const [blocks, edges] = await Promise.all([
    db.select().from(workflowBlocks).where(eq(workflowBlocks.workflowId, workflowId)),
    db.select().from(workflowEdges).where(eq(workflowEdges.workflowId, workflowId)),
  ])

  const blockMap: Record<string, any> = {}
  const loops: Record<string, any> = {}
  const parallels: Record<string, any> = {}

  for (const block of blocks) {
    blockMap[block.id] = {
      id: block.id,
      type: block.type,
      name: block.name,
      position: { x: Number(block.positionX), y: Number(block.positionY) },
      enabled: block.enabled,
      advancedMode: block.advancedMode,
      triggerMode: block.triggerMode,
      horizontalHandles: block.horizontalHandles,
      locked: block.locked,
      height: block.height ?? 0,
      subBlocks: block.subBlocks ?? {},
      outputs: block.outputs ?? {},
      data: block.data ?? {},
    }

    if (block.type === 'loop') {
      loops[block.id] = {
        id: block.id,
        nodes: [],
        iterations: (block.data as any)?.count ?? 5,
        loopType: (block.data as any)?.loopType ?? 'for',
        enabled: block.enabled,
      }
    }
    if (block.type === 'parallel') {
      parallels[block.id] = {
        id: block.id,
        nodes: [],
        count: (block.data as any)?.count ?? 5,
        parallelType: (block.data as any)?.parallelType ?? 'count',
        enabled: block.enabled,
      }
    }
  }

  // Set parent-child relationships for loops/parallels
  for (const block of blocks) {
    const parentId = (block.data as any)?.parentId
    if (parentId && loops[parentId]) {
      loops[parentId].nodes.push(block.id)
    }
    if (parentId && parallels[parentId]) {
      parallels[parentId].nodes.push(block.id)
    }
  }

  const edgeList = edges.map((e) => ({
    id: e.id,
    source: e.sourceBlockId,
    target: e.targetBlockId,
    sourceHandle: e.sourceHandle ?? 'source',
    targetHandle: e.targetHandle ?? 'target',
    type: 'default',
  }))

  return { blocks: blockMap, edges: edgeList, loops, parallels }
}

/**
 * Serialize the workflow state into a compact string for the LLM context
 */
export function serializeWorkflowState(state: {
  blocks: Record<string, any>
  edges: any[]
}): string {
  const blockSummaries = Object.entries(state.blocks).map(([id, block]) => {
    const inputs: Record<string, any> = {}
    if (block.subBlocks) {
      for (const [key, sub] of Object.entries(block.subBlocks)) {
        const val = (sub as any)?.value
        if (val !== null && val !== undefined && val !== '') {
          inputs[key] = val
        }
      }
    }
    return {
      id,
      type: block.type,
      name: block.name,
      enabled: block.enabled,
      triggerMode: block.triggerMode || undefined,
      parentId: block.data?.parentId || undefined,
      inputs: Object.keys(inputs).length > 0 ? inputs : undefined,
    }
  })

  const edgeSummaries = state.edges.map((e: any) => ({
    from: e.source,
    to: e.target,
    handle: e.sourceHandle !== 'source' ? e.sourceHandle : undefined,
  }))

  return JSON.stringify({ blocks: blockSummaries, edges: edgeSummaries }, null, 2)
}

/**
 * Build a compact registry of available block types for the system prompt.
 * Just type and name — the LLM uses get_blocks_metadata to look up details.
 */
export function buildBlockRegistrySummary(): string {
  const allBlocks = getAllBlocks()

  const categories: Record<string, string[]> = {}

  for (const block of allBlocks) {
    if (block.hideFromToolbar) continue

    const cat = block.category || 'other'
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(`${block.type} (${block.name})`)
  }

  const lines: string[] = []
  for (const [cat, types] of Object.entries(categories)) {
    lines.push(`### ${cat}`)
    lines.push(types.join(', '))
    lines.push('')
  }
  return lines.join('\n')
}

/**
 * Get detailed metadata for specific block types.
 * Used by the get_blocks_metadata tool so the LLM can look up input schemas on demand.
 */
export function getBlocksMetadata(blockTypes: string[]): Record<string, any> {
  const result: Record<string, any> = {}

  for (const type of blockTypes) {
    const config = getBlock(type)
    if (!config) {
      result[type] = { error: `Unknown block type "${type}"` }
      continue
    }

    const inputs = config.subBlocks
      .filter((sb) => !sb.id.startsWith('trigger') && sb.type !== 'oauth-input')
      .map((sb) => {
        const entry: any = {
          id: sb.id,
          type: sb.type,
        }
        if (sb.title) entry.title = sb.title
        if (sb.placeholder) entry.placeholder = sb.placeholder
        if (sb.options) {
          const opts = typeof sb.options === 'function' ? sb.options() : sb.options
          if (Array.isArray(opts)) {
            entry.options = opts.map((o) => o.id)
          }
        }
        if (sb.min !== undefined) entry.min = sb.min
        if (sb.max !== undefined) entry.max = sb.max
        return entry
      })

    const outputs = config.outputs
      ? Object.entries(config.outputs).map(([key, val]) => ({
          key,
          type: (val as any)?.type ?? 'unknown',
          description: (val as any)?.description,
        }))
      : []

    result[type] = {
      name: config.name,
      description: config.description,
      ...(config.longDescription && { details: config.longDescription }),
      ...(config.bestPractices && { bestPractices: config.bestPractices.trim() }),
      inputs,
      outputs,
    }
  }

  return result
}

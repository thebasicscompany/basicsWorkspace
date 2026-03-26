/**
 * Tag reference system — ported from Sim's tag-dropdown logic.
 *
 * Blocks reference each other's outputs via <blockName.field> syntax.
 * Only UPSTREAM blocks (connected via edges) are accessible.
 */

import { type ReactNode, createElement } from 'react'
import { getBlock } from '@/lib/sim/blocks'
import type { BlockState } from '@/apps/automations/stores/workflows/utils'
import { BlockPathCalculator } from './block-path-calculator'
import { getEffectiveBlockOutputPaths } from './block-outputs'
import type { Edge } from 'reactflow'

// ─── Name normalization (matches Sim's normalizeName) ────────────────────────

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '')
}

// ─── Tag trigger detection ───────────────────────────────────────────────────

export function checkTagTrigger(text: string, cursorPosition: number): boolean {
  if (cursorPosition < 1) return false
  const before = text.slice(0, cursorPosition)
  const lastOpen = before.lastIndexOf('<')
  if (lastOpen === -1) return false
  const lastClose = before.lastIndexOf('>')
  return lastOpen > lastClose
}

export function getTagSearchTerm(text: string, cursorPosition: number): string {
  const before = text.slice(0, cursorPosition)
  const lastOpen = before.lastIndexOf('<')
  if (lastOpen === -1) return ''
  const lastClose = before.lastIndexOf('>')
  if (lastClose > lastOpen) return ''
  return before.slice(lastOpen + 1).toLowerCase()
}

export function insertTag(
  text: string,
  cursorPosition: number,
  tagPath: string
): { newText: string; newCursor: number } {
  const before = text.slice(0, cursorPosition)
  const after = text.slice(cursorPosition)
  const lastOpen = before.lastIndexOf('<')

  if (lastOpen === -1) {
    const tag = `<${tagPath}>`
    const newText = before + tag + after
    return { newText, newCursor: before.length + tag.length }
  }

  const prefix = before.slice(0, lastOpen)
  const tag = `<${tagPath}>`

  // Consume trailing `>` if present and the text between is valid tag chars
  let remainder = after
  const nextClose = after.indexOf('>')
  if (nextClose !== -1) {
    const between = after.slice(0, nextClose)
    if (/^[a-zA-Z0-9._]*$/.test(between)) {
      remainder = after.slice(nextClose + 1)
    }
  }

  const newText = prefix + tag + remainder
  const newCursor = prefix.length + tag.length
  return { newText, newCursor }
}

// ─── Env var trigger detection ───────────────────────────────────────────────

export function checkEnvVarTrigger(
  text: string,
  cursorPosition: number
): { show: boolean; searchTerm: string } {
  const before = text.slice(0, cursorPosition)
  const match = before.match(/\{\{(\w*)$/)
  if (match) {
    return { show: true, searchTerm: match[1] }
  }
  if (before.endsWith('{{')) {
    return { show: true, searchTerm: '' }
  }
  return { show: false, searchTerm: '' }
}

export function insertEnvVar(
  text: string,
  cursorPosition: number,
  varName: string
): { newText: string; newCursor: number } {
  const before = text.slice(0, cursorPosition)
  const after = text.slice(cursorPosition)
  const match = before.match(/\{\{(\w*)$/)

  if (match) {
    const prefix = before.slice(0, match.index!)
    const tag = `{{${varName}}}`
    // Consume trailing `}}` if present
    const remainder = after.startsWith('}}') ? after.slice(2) : after
    const newText = prefix + tag + remainder
    return { newText, newCursor: prefix.length + tag.length }
  }

  const tag = `{{${varName}}}`
  const newText = before + tag + after
  return { newText, newCursor: before.length + tag.length }
}

// ─── Tag tree types ──────────────────────────────────────────────────────────

export interface TagNode {
  label: string
  path: string
  type?: string
  children?: TagNode[]
  blockType?: string
  blockColor?: string
  isBlock?: boolean
  distance?: number
}

// ─── Edge-aware tag tree builder ─────────────────────────────────────────────

/**
 * Build the tag tree using edge-based accessibility.
 * Only blocks connected upstream (via edges) to the current block are shown.
 *
 * @param subBlockValues - Live values from useSubBlockStore, keyed by blockId → subBlockId → value.
 *   Required because blockStates hold stale initial values; the subblock store has current edits.
 */
export function buildTagTree(
  blockStates: Record<string, BlockState>,
  edges: Edge[],
  currentBlockId: string,
  subBlockValues?: Record<string, Record<string, any>>
): TagNode[] {
  const tree: TagNode[] = []

  // Find accessible blocks via reverse edge traversal
  const graphEdges = edges.map((e) => ({ source: e.source, target: e.target }))
  const ancestorIds = BlockPathCalculator.findAllPathNodes(graphEdges, currentBlockId)
  const distances = BlockPathCalculator.getNodeDistances(graphEdges, currentBlockId)

  const accessibleIds = new Set<string>(ancestorIds)

  for (const blockId of accessibleIds) {
    const block = blockStates[blockId]
    if (!block) continue

    const blockConfig = getBlock(block.type)
    if (!blockConfig) continue

    // Merge live subblock values into block for output path resolution
    const mergedBlock = mergeSubBlockValues(block, subBlockValues?.[blockId])

    // Build subBlocks map for the output resolver
    const subBlocksForResolver: Record<string, { value?: unknown }> = {}
    for (const [sbId, sb] of Object.entries(mergedBlock.subBlocks)) {
      subBlocksForResolver[sbId] = { value: sb.value }
    }

    const outputPaths = getEffectiveBlockOutputPaths(block.type, subBlocksForResolver)
    if (outputPaths.length === 0) continue

    const children: TagNode[] = outputPaths.map((path) => {
      return {
        label: path,
        path: `${block.name}.${path}`,
        type: 'any',
      }
    })

    tree.push({
      label: block.name,
      path: block.name,
      blockType: block.type,
      blockColor: blockConfig.bgColor,
      isBlock: true,
      distance: distances.get(blockId) ?? 999,
      children,
    })
  }

  // Sort by distance (closest blocks first)
  tree.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))

  return tree
}

/**
 * Merge live subblock store values into a BlockState for accurate output resolution.
 */
function mergeSubBlockValues(
  block: BlockState,
  liveValues?: Record<string, any>
): BlockState {
  if (!liveValues) return block

  const merged = { ...block.subBlocks }
  for (const [subBlockId, value] of Object.entries(liveValues)) {
    if (merged[subBlockId]) {
      merged[subBlockId] = { ...merged[subBlockId], value }
    } else {
      // Orphaned value (exists in store but not in block config) — create minimal entry
      merged[subBlockId] = { id: subBlockId, type: 'short-input' as any, value }
    }
  }

  return { ...block, subBlocks: merged }
}

// ─── Formatted text (highlight tags and env vars) ────────────────────────────

const TAG_PATTERN = /<([a-zA-Z0-9_][a-zA-Z0-9_.[\]]*?)>/g
const ENV_VAR_PATTERN = /\{\{(\w+)\}\}/g
const COMBINED_PATTERN = /(<[a-zA-Z0-9_][a-zA-Z0-9_.[\]]*?>|\{\{\w+\}\})/g

export function formatDisplayText(
  text: string,
  accessiblePrefixes?: Set<string>
): ReactNode[] {
  if (!text) return []

  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  const regex = new RegExp(COMBINED_PATTERN.source, 'g')
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const matchText = match[0]
    const index = match.index

    // Plain text before this match
    if (index > lastIndex) {
      nodes.push(createElement('span', { key: key++ }, text.slice(lastIndex, index)))
    }

    const isTag = matchText.startsWith('<')
    const isEnvVar = matchText.startsWith('{{')

    let shouldHighlight = true

    if (isTag && accessiblePrefixes) {
      // Only highlight if the block prefix is accessible
      const inner = matchText.slice(1, -1)
      const prefix = inner.split('.')[0]
      const normalized = normalizeName(prefix)
      shouldHighlight = accessiblePrefixes.has(normalized)
    }

    if (shouldHighlight) {
      nodes.push(
        createElement(
          'span',
          {
            key: key++,
            style: { color: isEnvVar ? '#2F8BFF' : 'var(--color-accent)' },
          },
          matchText
        )
      )
    } else {
      nodes.push(createElement('span', { key: key++ }, matchText))
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(createElement('span', { key: key++ }, text.slice(lastIndex)))
  }

  return nodes
}

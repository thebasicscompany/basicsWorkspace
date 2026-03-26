'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Cube } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'
import { useShallow } from 'zustand/react/shallow'
import {
  getEffectiveBlockOutputPaths,
  getEffectiveBlockOutputType,
  getOutputPathsFromSchema,
} from '@/apps/automations/lib/block-outputs'
import { hasTriggerCapability } from '@/lib/workflows/triggers/trigger-utils'
import { TRIGGER_TYPES } from '@/lib/workflows/triggers/triggers'
import { useAccessibleReferencePrefixes } from '@/hooks/use-accessible-reference-prefixes'
import { getBlock } from '@/lib/sim/blocks'
import type { BlockConfig } from '@/lib/sim/blocks/types'
import { normalizeName } from '@/lib/sim/executor/constants'
import { useVariablesStore, type Variable } from '@/apps/automations/stores/variables'
import { useWorkflowRegistry } from '@/apps/automations/stores/registry'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'
import { useWorkflowStore } from '@/apps/automations/stores/workflow'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Exported trigger helpers (match Sim's signatures exactly) ──────────────

/**
 * Checks if the tag trigger (`<`) should show the tag dropdown.
 */
export const checkTagTrigger = (text: string, cursorPosition: number): { show: boolean } => {
  if (cursorPosition >= 1) {
    const textBeforeCursor = text.slice(0, cursorPosition)
    const lastOpenBracket = textBeforeCursor.lastIndexOf('<')
    const lastCloseBracket = textBeforeCursor.lastIndexOf('>')

    if (lastOpenBracket !== -1 && (lastCloseBracket === -1 || lastCloseBracket < lastOpenBracket)) {
      return { show: true }
    }
  }
  return { show: false }
}

/**
 * Extracts the search term for tag filtering from the current input.
 */
export const getTagSearchTerm = (text: string, cursorPosition: number): string => {
  if (cursorPosition <= 0) return ''
  const textBeforeCursor = text.slice(0, cursorPosition)
  const lastOpenBracket = textBeforeCursor.lastIndexOf('<')
  if (lastOpenBracket === -1) return ''
  const lastCloseBracket = textBeforeCursor.lastIndexOf('>')
  if (lastCloseBracket > lastOpenBracket) return ''
  return textBeforeCursor.slice(lastOpenBracket + 1).toLowerCase()
}

// ─── Types (copied from Sim) ────────────────────────────────────────────────

interface BlockTagGroup {
  blockName: string
  blockId: string
  blockType: string
  tags: string[]
  distance: number
  isContextual?: boolean
}

interface NestedTagChild {
  key: string
  display: string
  fullTag: string
}

interface NestedTag {
  key: string
  display: string
  fullTag?: string
  parentTag?: string
  children?: NestedTagChild[]
  nestedChildren?: NestedTag[]
}

interface NestedBlockTagGroup extends BlockTagGroup {
  nestedTags: NestedTag[]
}

interface TagComputationResult {
  tags: string[]
  variableInfoMap: Record<string, { type: string; id: string }>
  blockTagGroups: BlockTagGroup[]
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BLOCK_COLORS = {
  VARIABLE: '#2F8BFF',
  DEFAULT: '#2D8653',
  LOOP: '#2FB3FF',
  PARALLEL: '#FEE12B',
} as const

const TAG_PREFIXES = {
  VARIABLE: 'variable.',
} as const

// ─── Helpers (copied from Sim) ──────────────────────────────────────────────

const ensureRootTag = (tags: string[], rootTag: string): string[] => {
  if (!rootTag) return tags
  if (tags.includes(rootTag)) return tags
  return [rootTag, ...tags]
}

const getSubBlockValue = (blockId: string, property: string): any => {
  return useSubBlockStore.getState().getValue(blockId, property)
}

const getOutputTypeForPath = (
  block: any,
  blockConfig: BlockConfig | null,
  blockId: string,
  outputPath: string,
  mergedSubBlocksOverride?: Record<string, any>
): string => {
  if (block?.type === 'variables') return 'any'
  const subBlocks =
    mergedSubBlocksOverride ?? useWorkflowStore.getState().blocks[blockId]?.subBlocks
  const isTriggerCapable = blockConfig ? hasTriggerCapability(blockConfig) : false
  const triggerMode = Boolean(block?.triggerMode && isTriggerCapable)
  return getEffectiveBlockOutputType(block?.type ?? '', outputPath, subBlocks, {
    triggerMode,
    preferToolOutputs: !triggerMode,
  })
}

const getCaretViewportPosition = (
  element: HTMLTextAreaElement | HTMLInputElement,
  caretPosition: number,
  text: string
) => {
  const elementRect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  const mirrorDiv = document.createElement('div')
  mirrorDiv.style.position = 'absolute'
  mirrorDiv.style.visibility = 'hidden'
  mirrorDiv.style.whiteSpace = 'pre-wrap'
  mirrorDiv.style.wordWrap = 'break-word'
  mirrorDiv.style.font = style.font
  mirrorDiv.style.padding = style.padding
  mirrorDiv.style.border = style.border
  mirrorDiv.style.width = style.width
  mirrorDiv.style.lineHeight = style.lineHeight
  mirrorDiv.style.boxSizing = style.boxSizing
  mirrorDiv.style.letterSpacing = style.letterSpacing
  mirrorDiv.style.textTransform = style.textTransform
  mirrorDiv.style.textIndent = style.textIndent
  mirrorDiv.style.textAlign = style.textAlign
  mirrorDiv.textContent = text.substring(0, caretPosition)

  const caretMarker = document.createElement('span')
  caretMarker.style.display = 'inline-block'
  caretMarker.style.width = '0px'
  caretMarker.style.padding = '0'
  caretMarker.style.border = '0'
  mirrorDiv.appendChild(caretMarker)

  document.body.appendChild(mirrorDiv)
  const markerRect = caretMarker.getBoundingClientRect()
  const mirrorRect = mirrorDiv.getBoundingClientRect()
  document.body.removeChild(mirrorDiv)

  return {
    left: elementRect.left + (markerRect.left - mirrorRect.left) - element.scrollLeft,
    top: elementRect.top + (markerRect.top - mirrorRect.top) - element.scrollTop,
  }
}

// ─── Tree building (copied from Sim) ────────────────────────────────────────

interface TagTreeNode {
  key: string
  fullTag?: string
  children: Map<string, TagTreeNode>
}

const buildNestedTagTree = (tags: string[], blockName: string): NestedTag[] => {
  const root: TagTreeNode = { key: 'root', children: new Map() }

  for (const tag of tags) {
    const parts = tag.split('.')
    if (parts.length < 2) continue
    const pathParts = parts.slice(1)
    let current = root

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      if (!current.children.has(part)) {
        current.children.set(part, { key: part, children: new Map() })
      }
      const node = current.children.get(part)!
      if (i === pathParts.length - 1) node.fullTag = tag
      current = node
    }
  }

  const convertToNestedTags = (
    node: TagTreeNode,
    parentPath: string,
    blockPrefix: string
  ): NestedTag[] => {
    const result: NestedTag[] = []
    for (const [key, child] of node.children) {
      const currentPath = parentPath ? `${parentPath}.${key}` : key
      const parentTag = `${blockPrefix}.${currentPath}`

      if (child.children.size === 0) {
        result.push({ key: currentPath, display: key, fullTag: child.fullTag || parentTag })
      } else {
        const nestedChildren = convertToNestedTags(child, currentPath, blockPrefix)
        const leafChildren: NestedTagChild[] = []
        const folders: NestedTag[] = []

        for (const nestedChild of nestedChildren) {
          if (nestedChild.nestedChildren || nestedChild.children) {
            folders.push(nestedChild)
          } else {
            leafChildren.push({
              key: nestedChild.key,
              display: nestedChild.display,
              fullTag: nestedChild.fullTag!,
            })
          }
        }

        result.push({
          key: currentPath,
          display: key,
          parentTag,
          children: leafChildren.length > 0 ? leafChildren : undefined,
          nestedChildren: folders.length > 0 ? folders : undefined,
        })
      }
    }
    return result
  }

  return convertToNestedTags(root, '', blockName)
}

// ─── Props (Sim-compatible interface) ───────────────────────────────────────

interface TagDropdownProps {
  visible: boolean
  onSelect: (newValue: string, newCursorPosition: number) => void
  blockId: string
  activeSourceBlockId: string | null
  className?: string
  inputValue: string
  cursorPosition: number
  onClose?: () => void
  style?: React.CSSProperties
  inputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement>
}

// ─── TagDropdown Component ──────────────────────────────────────────────────

export const TagDropdown: React.FC<TagDropdownProps> = ({
  visible,
  onSelect,
  blockId,
  activeSourceBlockId,
  className,
  inputValue,
  cursorPosition,
  onClose,
  style,
  inputRef,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [navigationStack, setNavigationStack] = useState<NestedTag[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const inputValueRef = useRef(inputValue)
  const cursorPositionRef = useRef(cursorPosition)
  inputValueRef.current = inputValue
  cursorPositionRef.current = cursorPosition

  // ── Store subscriptions ─────────────────────────────────────────────────

  const { blocks, edges, loops, parallels } = useWorkflowStore(
    useShallow((state: any) => ({
      blocks: state.blocks,
      edges: state.edges,
      loops: state.loops || {},
      parallels: state.parallels || {},
    }))
  )

  const workflowId = useWorkflowRegistry((state) => state.activeWorkflowId)
  const rawAccessiblePrefixes = useAccessibleReferencePrefixes(blockId)

  const combinedAccessiblePrefixes = useMemo(() => {
    if (!rawAccessiblePrefixes) return new Set<string>()
    return new Set<string>(rawAccessiblePrefixes)
  }, [rawAccessiblePrefixes])

  const workflowSubBlockValues = useSubBlockStore((state: any) =>
    workflowId ? (state.workflowValues[workflowId] ?? {}) : {}
  )

  const getMergedSubBlocks = useCallback(
    (targetBlockId: string): Record<string, any> => {
      const base = blocks[targetBlockId]?.subBlocks || {}
      const live = workflowSubBlockValues?.[targetBlockId] || {}
      const merged: Record<string, any> = { ...base }
      for (const [subId, liveVal] of Object.entries(live)) {
        merged[subId] = { ...(base[subId] || {}), value: liveVal }
      }
      return merged
    },
    [blocks, workflowSubBlockValues]
  )

  const getVariablesByWorkflowId = useVariablesStore((state) => state.getVariablesByWorkflowId)
  const workflowVariables = workflowId ? getVariablesByWorkflowId(workflowId) : []

  const searchTerm = useMemo(
    () => getTagSearchTerm(inputValue, cursorPosition),
    [inputValue, cursorPosition]
  )

  const emptyVariableInfoMap: Record<string, { type: string; id: string }> = {}

  // ── Tag computation (copied from Sim literally) ─────────────────────────

  const { tags, variableInfoMap, blockTagGroups } = useMemo<TagComputationResult>(() => {
    if (activeSourceBlockId) {
      const sourceBlock = blocks[activeSourceBlockId]
      if (!sourceBlock) {
        return { tags: [], variableInfoMap: emptyVariableInfoMap, blockTagGroups: [] }
      }

      const blockConfig = getBlock(sourceBlock.type)

      if (!blockConfig) {
        if (sourceBlock.type === 'loop' || sourceBlock.type === 'parallel') {
          const mockConfig = { outputs: { results: 'array' } }
          const blockName = sourceBlock.name || sourceBlock.type
          const normalizedBlockName = normalizeName(blockName)
          const outputPaths = getOutputPathsFromSchema(mockConfig.outputs)
          const blockTags = outputPaths.map((path: string) => `${normalizedBlockName}.${path}`)
          const blockTagGroups: BlockTagGroup[] = [{
            blockName, blockId: activeSourceBlockId, blockType: sourceBlock.type,
            tags: blockTags, distance: 0,
          }]
          return { tags: blockTags, variableInfoMap: emptyVariableInfoMap, blockTagGroups }
        }
        return { tags: [], variableInfoMap: emptyVariableInfoMap, blockTagGroups: [] }
      }

      const blockName = sourceBlock.name || sourceBlock.type
      const normalizedBlockName = normalizeName(blockName)
      const mergedSubBlocks = getMergedSubBlocks(activeSourceBlockId)
      let blockTags: string[]

      if (sourceBlock.type === 'variables') {
        const variablesValue = getSubBlockValue(activeSourceBlockId, 'variables')
        if (variablesValue && Array.isArray(variablesValue) && variablesValue.length > 0) {
          const validAssignments = variablesValue.filter((a: any) => a?.variableName?.trim())
          blockTags = validAssignments.map((a: any) => `${normalizedBlockName}.${a.variableName.trim()}`)
        } else {
          blockTags = [normalizedBlockName]
        }
      } else {
        const sourceBlockConfig = getBlock(sourceBlock.type)
        const isTriggerCapable = sourceBlockConfig ? hasTriggerCapability(sourceBlockConfig) : false
        const effectiveTriggerMode = Boolean(sourceBlock.triggerMode && isTriggerCapable)
        const outputPaths = getEffectiveBlockOutputPaths(sourceBlock.type, mergedSubBlocks, {
          triggerMode: effectiveTriggerMode,
          preferToolOutputs: !effectiveTriggerMode,
        })
        const allTags = outputPaths.map((path: string) => `${normalizedBlockName}.${path}`)

        if (sourceBlock.type === 'human_in_the_loop' && activeSourceBlockId === blockId) {
          blockTags = allTags.filter((tag: string) => tag.endsWith('.url') || tag.endsWith('.resumeEndpoint'))
        } else if (allTags.length === 0) {
          blockTags = [normalizedBlockName]
        } else {
          blockTags = allTags
        }
      }

      blockTags = ensureRootTag(blockTags, normalizedBlockName)
      const shouldShowRootTag =
        sourceBlock.type === TRIGGER_TYPES.GENERIC_WEBHOOK || sourceBlock.type === 'start_trigger'
      if (!shouldShowRootTag) {
        blockTags = blockTags.filter((tag: string) => tag !== normalizedBlockName)
      }

      const blockTagGroups: BlockTagGroup[] = [{
        blockName, blockId: activeSourceBlockId, blockType: sourceBlock.type,
        tags: blockTags, distance: 0,
      }]
      return { tags: blockTags, variableInfoMap: emptyVariableInfoMap, blockTagGroups }
    }

    // No active source — compute all accessible blocks
    const hasInvalidBlocks = Object.values(blocks).some((block: any) => !block || !block.type)
    if (hasInvalidBlocks) {
      return { tags: [], variableInfoMap: emptyVariableInfoMap, blockTagGroups: [] }
    }

    const starterBlock = Object.values(blocks).find((block: any) => block.type === 'starter') as any

    const blockDistances: Record<string, number> = {}
    if (starterBlock) {
      const adjList: Record<string, string[]> = {}
      for (const edge of edges) {
        if (!adjList[edge.source]) adjList[edge.source] = []
        adjList[edge.source].push(edge.target)
      }
      const visited = new Set<string>()
      const queue: [string, number][] = [[starterBlock.id, 0]]
      while (queue.length > 0) {
        const [currentNodeId, distance] = queue.shift()!
        if (visited.has(currentNodeId)) continue
        visited.add(currentNodeId)
        blockDistances[currentNodeId] = distance
        const outgoingNodeIds = adjList[currentNodeId] || []
        for (const targetId of outgoingNodeIds) {
          queue.push([targetId, distance + 1])
        }
      }
    }

    const validVariables = workflowVariables.filter((variable: Variable) => variable.name.trim() !== '')
    const variableTags = validVariables.map(
      (variable: Variable) => `${TAG_PREFIXES.VARIABLE}${normalizeName(variable.name)}`
    )
    const variableInfoMap = validVariables.reduce(
      (acc: Record<string, { type: string; id: string }>, variable: Variable) => {
        const tagName = `${TAG_PREFIXES.VARIABLE}${normalizeName(variable.name)}`
        acc[tagName] = { type: variable.type, id: variable.id }
        return acc
      },
      {} as Record<string, { type: string; id: string }>
    )

    // Loop contextual tags
    const loopBlockGroups: BlockTagGroup[] = []
    const ancestorLoopIds = new Set<string>()
    const visitedContainerIds = new Set<string>()

    const findAncestorContainers = (targetId: string) => {
      if (visitedContainerIds.has(targetId)) return
      visitedContainerIds.add(targetId)
      for (const [loopId, loop] of Object.entries(loops as Record<string, any>)) {
        if (loop.nodes.includes(targetId) && !ancestorLoopIds.has(loopId)) {
          ancestorLoopIds.add(loopId)
          const loopBlock = blocks[loopId]
          if (loopBlock) {
            const loopType = loop.loopType || 'for'
            const loopBlockName = loopBlock.name || loopBlock.type
            const normalizedLoopName = normalizeName(loopBlockName)
            const contextualTags: string[] = [`${normalizedLoopName}.index`]
            if (loopType === 'forEach') {
              contextualTags.push(`${normalizedLoopName}.currentItem`)
              contextualTags.push(`${normalizedLoopName}.items`)
            }
            loopBlockGroups.push({
              blockName: loopBlockName, blockId: loopId, blockType: 'loop',
              tags: contextualTags, distance: 0, isContextual: true,
            })
          }
          findAncestorContainers(loopId)
        }
      }
      for (const [parallelId, parallel] of Object.entries(parallels as Record<string, any> || {})) {
        if (parallel.nodes.includes(targetId)) {
          findAncestorContainers(parallelId)
        }
      }
    }

    const isLoopBlock = blocks[blockId]?.type === 'loop'
    if (isLoopBlock && loops[blockId]) {
      const loop = loops[blockId]
      ancestorLoopIds.add(blockId)
      const loopBlock = blocks[blockId]
      if (loopBlock) {
        const loopType = loop.loopType || 'for'
        const loopBlockName = loopBlock.name || loopBlock.type
        const normalizedLoopName = normalizeName(loopBlockName)
        const contextualTags: string[] = [`${normalizedLoopName}.index`]
        if (loopType === 'forEach') {
          contextualTags.push(`${normalizedLoopName}.currentItem`)
          contextualTags.push(`${normalizedLoopName}.items`)
        }
        loopBlockGroups.push({
          blockName: loopBlockName, blockId, blockType: 'loop',
          tags: contextualTags, distance: 0, isContextual: true,
        })
      }
      findAncestorContainers(blockId)
    } else {
      findAncestorContainers(blockId)
    }

    // Parallel contextual tags
    const parallelBlockGroups: BlockTagGroup[] = []
    const ancestorParallelIds = new Set<string>()
    const visitedParallelTargets = new Set<string>()

    const findAncestorParallels = (targetId: string) => {
      if (visitedParallelTargets.has(targetId)) return
      visitedParallelTargets.add(targetId)
      for (const [parallelId, parallel] of Object.entries(parallels as Record<string, any> || {})) {
        if (parallel.nodes.includes(targetId) && !ancestorParallelIds.has(parallelId)) {
          ancestorParallelIds.add(parallelId)
          const parallelBlock = blocks[parallelId]
          if (parallelBlock) {
            const parallelType = parallel.parallelType || 'count'
            const parallelBlockName = parallelBlock.name || parallelBlock.type
            const normalizedParallelName = normalizeName(parallelBlockName)
            const contextualTags: string[] = [`${normalizedParallelName}.index`]
            if (parallelType === 'collection') {
              contextualTags.push(`${normalizedParallelName}.currentItem`)
              contextualTags.push(`${normalizedParallelName}.items`)
            }
            parallelBlockGroups.push({
              blockName: parallelBlockName, blockId: parallelId, blockType: 'parallel',
              tags: contextualTags, distance: 0, isContextual: true,
            })
          }
          for (const [loopId, loop] of Object.entries(loops as Record<string, any>)) {
            if (loop.nodes.includes(parallelId)) {
              findAncestorParallels(loopId)
            }
          }
          findAncestorParallels(parallelId)
        }
      }
    }

    findAncestorParallels(blockId)
    for (const loopId of ancestorLoopIds) {
      findAncestorParallels(loopId)
    }

    // Regular block tags
    const blockTagGroups: BlockTagGroup[] = []
    const allBlockTags: string[] = []

    const accessibleBlockIds = combinedAccessiblePrefixes ? Array.from(combinedAccessiblePrefixes) : []
    for (const accessibleBlockId of accessibleBlockIds) {
      const accessibleBlock = blocks[accessibleBlockId]
      if (!accessibleBlock) continue
      if (accessibleBlockId === blockId && accessibleBlock.type !== 'human_in_the_loop') continue

      const blockConfig = getBlock(accessibleBlock.type)

      if (!blockConfig) {
        if (accessibleBlock.type === 'loop' || accessibleBlock.type === 'parallel') {
          if (ancestorLoopIds.has(accessibleBlockId) || ancestorParallelIds.has(accessibleBlockId)) continue
          const mockConfig = { outputs: { results: 'array' } }
          const blockName = accessibleBlock.name || accessibleBlock.type
          const normalizedBlockName = normalizeName(blockName)
          const outputPaths = getOutputPathsFromSchema(mockConfig.outputs)
          let blockTags = outputPaths.map((path: string) => `${normalizedBlockName}.${path}`)
          blockTags = ensureRootTag(blockTags, normalizedBlockName)
          blockTagGroups.push({
            blockName, blockId: accessibleBlockId, blockType: accessibleBlock.type,
            tags: blockTags, distance: blockDistances[accessibleBlockId] || 0,
          })
          allBlockTags.push(...blockTags)
        }
        continue
      }

      const blockName = accessibleBlock.name || accessibleBlock.type
      const normalizedBlockName = normalizeName(blockName)
      const mergedSubBlocks = getMergedSubBlocks(accessibleBlockId)
      let blockTags: string[]

      if (accessibleBlock.type === 'variables') {
        const variablesValue = getSubBlockValue(accessibleBlockId, 'variables')
        if (variablesValue && Array.isArray(variablesValue) && variablesValue.length > 0) {
          const validAssignments = variablesValue.filter((a: any) => a?.variableName?.trim())
          blockTags = validAssignments.map((a: any) => `${normalizedBlockName}.${a.variableName.trim()}`)
        } else {
          blockTags = [normalizedBlockName]
        }
      } else {
        const accessibleBlockConfig = getBlock(accessibleBlock.type)
        const isTriggerCapable = accessibleBlockConfig ? hasTriggerCapability(accessibleBlockConfig) : false
        const effectiveTriggerMode = Boolean(accessibleBlock.triggerMode && isTriggerCapable)
        const outputPaths = getEffectiveBlockOutputPaths(accessibleBlock.type, mergedSubBlocks, {
          triggerMode: effectiveTriggerMode,
          preferToolOutputs: !effectiveTriggerMode,
        })
        const allTags = outputPaths.map((path: string) => `${normalizedBlockName}.${path}`)

        if (accessibleBlock.type === 'human_in_the_loop' && accessibleBlockId === blockId) {
          blockTags = allTags.filter((tag: string) => tag.endsWith('.url') || tag.endsWith('.resumeEndpoint'))
        } else if (allTags.length === 0) {
          blockTags = [normalizedBlockName]
        } else {
          blockTags = allTags
        }
      }

      blockTags = ensureRootTag(blockTags, normalizedBlockName)
      const shouldShowRootTag =
        accessibleBlock.type === TRIGGER_TYPES.GENERIC_WEBHOOK || accessibleBlock.type === 'start_trigger'
      if (!shouldShowRootTag) {
        blockTags = blockTags.filter((tag: string) => tag !== normalizedBlockName)
      }

      blockTagGroups.push({
        blockName, blockId: accessibleBlockId, blockType: accessibleBlock.type,
        tags: blockTags, distance: blockDistances[accessibleBlockId] || 0,
      })
      allBlockTags.push(...blockTags)
    }

    const finalBlockTagGroups: BlockTagGroup[] = []
    finalBlockTagGroups.push(...loopBlockGroups)
    finalBlockTagGroups.push(...parallelBlockGroups)
    blockTagGroups.sort((a, b) => a.distance - b.distance)
    finalBlockTagGroups.push(...blockTagGroups)

    const groupTags = finalBlockTagGroups.flatMap((group) => group.tags)
    const tags = [...groupTags, ...variableTags]

    return { tags, variableInfoMap, blockTagGroups: finalBlockTagGroups }
  }, [
    activeSourceBlockId, combinedAccessiblePrefixes, blockId,
    blocks, edges, getMergedSubBlocks, loops, parallels,
    workflowVariables, workflowId,
  ])

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredTags = useMemo(() => {
    if (!searchTerm) return tags
    return tags.filter((tag: string) => tag.toLowerCase().includes(searchTerm))
  }, [tags, searchTerm])

  const { variableTags, filteredBlockTagGroups } = useMemo(() => {
    const varTags: string[] = []
    filteredTags.forEach((tag: string) => {
      if (tag.startsWith(TAG_PREFIXES.VARIABLE)) varTags.push(tag)
    })
    const filteredGroups = blockTagGroups
      .map((group: BlockTagGroup) => ({
        ...group,
        tags: group.tags.filter((tag: string) => !searchTerm || tag.toLowerCase().includes(searchTerm)),
      }))
      .filter((group: BlockTagGroup) => group.tags.length > 0)
    return { variableTags: varTags, filteredBlockTagGroups: filteredGroups }
  }, [filteredTags, blockTagGroups, searchTerm])

  const nestedBlockTagGroups: NestedBlockTagGroup[] = useMemo(() => {
    return filteredBlockTagGroups.map((group: BlockTagGroup) => {
      const normalizedBlockName = normalizeName(group.blockName)
      const directTags: NestedTag[] = []
      const tagsForTree: string[] = []

      group.tags.forEach((tag: string) => {
        const tagParts = tag.split('.')
        if (tagParts.length === 1) {
          directTags.push({ key: tag, display: tag, fullTag: tag })
        } else if (tagParts.length === 2) {
          directTags.push({ key: tagParts[1], display: tagParts[1], fullTag: tag })
        } else {
          tagsForTree.push(tag)
        }
      })

      const nestedTags = [...directTags, ...buildNestedTagTree(tagsForTree, normalizedBlockName)]
      return { ...group, nestedTags }
    })
  }, [filteredBlockTagGroups])

  // Flat list for keyboard navigation
  const flatTagList = useMemo(() => {
    const list: Array<{ tag: string; group?: BlockTagGroup }> = []
    variableTags.forEach((tag) => list.push({ tag }))

    const flattenNestedTag = (nestedTag: NestedTag, group: BlockTagGroup, rootTag: string) => {
      if (nestedTag.fullTag === rootTag) return
      if (nestedTag.parentTag) list.push({ tag: nestedTag.parentTag, group })
      if (nestedTag.fullTag && !nestedTag.children && !nestedTag.nestedChildren) {
        list.push({ tag: nestedTag.fullTag, group })
      }
      nestedTag.children?.forEach((child) => list.push({ tag: child.fullTag, group }))
      nestedTag.nestedChildren?.forEach((nc) => flattenNestedTag(nc, group, rootTag))
    }

    nestedBlockTagGroups.forEach((group) => {
      const normalizedBlockName = normalizeName(group.blockName)
      const rootTag = group.tags.find((tag) => tag === normalizedBlockName) || normalizedBlockName
      list.push({ tag: rootTag, group })
      group.nestedTags.forEach((nt) => flattenNestedTag(nt, group, rootTag))
    })

    return list
  }, [variableTags, nestedBlockTagGroups])

  const flatTagIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    flatTagList.forEach((item, index) => map.set(item.tag, index))
    return map
  }, [flatTagList])

  // ── Tag selection handler (copied from Sim) ───────────────────────────────

  const handleTagSelect = useCallback(
    (tag: string, blockGroup?: BlockTagGroup) => {
      let liveCursor = cursorPositionRef.current
      let liveValue = inputValueRef.current

      if (typeof window !== 'undefined' && document?.activeElement) {
        const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
        if (activeEl && typeof activeEl.selectionStart === 'number') {
          liveCursor = activeEl.selectionStart ?? cursorPositionRef.current
          if ('value' in activeEl && typeof activeEl.value === 'string') {
            liveValue = activeEl.value
          }
        }
      }

      const textBeforeCursor = liveValue.slice(0, liveCursor)
      const textAfterCursor = liveValue.slice(liveCursor)
      const lastOpenBracket = textBeforeCursor.lastIndexOf('<')

      let processedTag = tag

      const parts = tag.split('.')
      if (parts.length >= 3 && blockGroup) {
        const arrayFieldName = parts[1]
        const block = useWorkflowStore.getState().blocks[blockGroup.blockId]
        const blockConfig = block ? (getBlock(block.type) ?? null) : null
        const mergedSubBlocks = getMergedSubBlocks(blockGroup.blockId)
        const fieldType = getOutputTypeForPath(block, blockConfig, blockGroup.blockId, arrayFieldName, mergedSubBlocks)
        if (fieldType === 'file' || fieldType === 'file[]' || fieldType === 'array') {
          const blockName = parts[0]
          const remainingPath = parts.slice(2).join('.')
          processedTag = `${blockName}.${arrayFieldName}[0].${remainingPath}`
        }
      }

      if (tag.startsWith(TAG_PREFIXES.VARIABLE)) {
        const variableName = tag.substring(TAG_PREFIXES.VARIABLE.length)
        const variableObj = workflowVariables.find(
          (v: Variable) => v.name.replace(/\s+/g, '') === variableName
        )
        if (variableObj) processedTag = tag
      }

      let newValue: string
      let insertStart: number

      if (lastOpenBracket === -1) {
        newValue = `${textBeforeCursor}<${processedTag}>${textAfterCursor}`
        insertStart = liveCursor
      } else {
        const nextCloseBracket = textAfterCursor.indexOf('>')
        let remainingTextAfterCursor = textAfterCursor
        if (nextCloseBracket !== -1) {
          const textBetween = textAfterCursor.slice(0, nextCloseBracket)
          if (/^[a-zA-Z0-9._]*$/.test(textBetween)) {
            remainingTextAfterCursor = textAfterCursor.slice(nextCloseBracket + 1)
          }
        }
        newValue = `${textBeforeCursor.slice(0, lastOpenBracket)}<${processedTag}>${remainingTextAfterCursor}`
        insertStart = lastOpenBracket
      }

      const newCursorPos = insertStart + 1 + processedTag.length + 1
      onSelect(newValue, newCursorPos)
      onClose?.()
    },
    [workflowVariables, onSelect, onClose, getMergedSubBlocks]
  )

  // ── Keyboard navigation ───────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) {
      setNavigationStack([])
      return
    }

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((prev) => Math.min(prev + 1, flatTagList.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          e.stopPropagation()
          if (flatTagList[selectedIndex]) {
            handleTagSelect(flatTagList[selectedIndex].tag, flatTagList[selectedIndex].group)
          }
          break
        case 'Escape':
          e.preventDefault()
          e.stopPropagation()
          onClose?.()
          break
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [visible, selectedIndex, flatTagList, handleTagSelect, onClose])

  useEffect(() => {
    setSelectedIndex(0)
  }, [flatTagList.length])

  // ── Render ────────────────────────────────────────────────────────────────

  if (!visible || tags.length === 0 || flatTagList.length === 0) return null

  const inputElement = inputRef?.current
  let caretViewport = { left: 0, top: 0 }
  let side: 'top' | 'bottom' = 'bottom'

  if (inputElement) {
    caretViewport = getCaretViewportPosition(inputElement, cursorPosition, inputValue)
    const margin = 8
    const spaceAbove = caretViewport.top - margin
    const spaceBelow = window.innerHeight - caretViewport.top - margin
    side = spaceBelow >= spaceAbove ? 'bottom' : 'top'
  }

  // Current view (support folder navigation)
  const currentGroup = navigationStack.length > 0
    ? navigationStack[navigationStack.length - 1]
    : null

  const dropdown = (
    <div
      className={className}
      style={{
        ...style,
        position: inputElement ? 'fixed' : 'absolute',
        top: inputElement
          ? side === 'bottom' ? `${caretViewport.top + 20}px` : undefined
          : style?.top,
        bottom: inputElement && side === 'top'
          ? `${window.innerHeight - caretViewport.top + 4}px`
          : undefined,
        left: inputElement ? `${caretViewport.left}px` : style?.left,
        zIndex: 100000000,
      }}
    >
      <div
        className="min-w-[280px] rounded-lg border shadow-md overflow-hidden"
        style={{
          background: '#1a1a2e',
          borderColor: 'rgba(255,255,255,0.1)',
          maxHeight: '240px',
        }}
      >
        <ScrollArea ref={scrollAreaRef} style={{ maxHeight: '240px' }}>
          {/* Back button when in nested view */}
          {navigationStack.length > 0 && (
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault()
                setNavigationStack((s) => s.slice(0, -1))
              }}
            >
              <ArrowLeft size={12} />
              <span>Back</span>
            </button>
          )}

          {flatTagList.length === 0 ? (
            <div className="px-3 py-2 text-xs text-white/40">No matching tags found</div>
          ) : (
            <>
              {/* Variable tags */}
              {variableTags.length > 0 && !currentGroup && (
                <>
                  <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/50">
                    <TagIcon letter="V" color={BLOCK_COLORS.VARIABLE} />
                    Variables
                  </div>
                  {variableTags.map((tag: string) => {
                    const globalIndex = flatTagIndexMap.get(tag) ?? -1
                    const info = variableInfoMap?.[tag]
                    return (
                      <TagListItem
                        key={tag}
                        label={tag.startsWith(TAG_PREFIXES.VARIABLE) ? tag.substring(TAG_PREFIXES.VARIABLE.length) : tag}
                        typeLabel={info?.type}
                        isSelected={globalIndex === selectedIndex}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        onMouseDown={(e) => { e.preventDefault(); handleTagSelect(tag) }}
                      />
                    )
                  })}
                  {nestedBlockTagGroups.length > 0 && (
                    <div className="mx-2 my-1 border-t border-white/10" />
                  )}
                </>
              )}

              {/* Block tag groups */}
              {nestedBlockTagGroups.map((group, groupIndex) => {
                const blockConfig = getBlock(group.blockType)
                let blockColor = blockConfig?.bgColor || BLOCK_COLORS.DEFAULT
                if (group.blockType === 'loop') blockColor = BLOCK_COLORS.LOOP
                else if (group.blockType === 'parallel') blockColor = BLOCK_COLORS.PARALLEL

                const normalizedBlockName = normalizeName(group.blockName)
                const rootTag = group.tags.find((tag) => tag === normalizedBlockName) || normalizedBlockName
                const rootTagGlobalIndex = flatTagIndexMap.get(rootTag) ?? -1

                return (
                  <div key={group.blockId}>
                    {/* Block header / root tag */}
                    <TagListItem
                      label={group.blockName}
                      isSelected={rootTagGlobalIndex === selectedIndex}
                      onMouseEnter={() => { if (rootTagGlobalIndex >= 0) setSelectedIndex(rootTagGlobalIndex) }}
                      onMouseDown={(e) => { e.preventDefault(); handleTagSelect(rootTag, group) }}
                      icon={<TagIcon letter={group.blockName.charAt(0).toUpperCase()} color={blockColor} />}
                      isBold
                    />

                    {/* Nested tags */}
                    {group.nestedTags.map((nestedTag) => {
                      if (nestedTag.fullTag === rootTag) return null
                      return renderNestedTag(nestedTag, group)
                    })}

                    {groupIndex < nestedBlockTagGroups.length - 1 && (
                      <div className="mx-2 my-1 border-t border-white/10" />
                    )}
                  </div>
                )
              })}
            </>
          )}
        </ScrollArea>
      </div>
    </div>
  )

  // Render nested tag items recursively
  function renderNestedTag(nestedTag: NestedTag, group: BlockTagGroup): React.ReactNode {
    const hasChildren = (nestedTag.children && nestedTag.children.length > 0) ||
      (nestedTag.nestedChildren && nestedTag.nestedChildren.length > 0)

    if (hasChildren) {
      const parentGlobalIndex = nestedTag.parentTag
        ? (flatTagIndexMap.get(nestedTag.parentTag) ?? -1)
        : -1

      return (
        <TagListItem
          key={`${group.blockId}-${nestedTag.key}`}
          label={nestedTag.display}
          isSelected={parentGlobalIndex === selectedIndex}
          onMouseEnter={() => { if (parentGlobalIndex >= 0) setSelectedIndex(parentGlobalIndex) }}
          onMouseDown={(e) => {
            e.preventDefault()
            if (nestedTag.parentTag) handleTagSelect(nestedTag.parentTag, group)
          }}
          suffix={<ArrowRight size={10} className="text-white/40" />}
          indent
        />
      )
    }

    const globalIndex = nestedTag.fullTag ? (flatTagIndexMap.get(nestedTag.fullTag) ?? -1) : -1

    let tagType = ''
    if (nestedTag.fullTag) {
      const tagParts = nestedTag.fullTag.split('.')
      const outputPath = tagParts.slice(1).join('.')
      const block = Object.values(blocks).find((b: any) => b.id === group.blockId) as any
      if (block) {
        const blockConfig = getBlock(block.type)
        const mergedSubBlocks = getMergedSubBlocks(group.blockId)
        tagType = getOutputTypeForPath(block, blockConfig || null, group.blockId, outputPath, mergedSubBlocks)
      }
    }

    return (
      <TagListItem
        key={`${group.blockId}-${nestedTag.key}`}
        label={nestedTag.display}
        typeLabel={tagType && tagType !== 'any' ? tagType : undefined}
        isSelected={globalIndex === selectedIndex}
        onMouseEnter={() => { if (globalIndex >= 0) setSelectedIndex(globalIndex) }}
        onMouseDown={(e) => {
          e.preventDefault()
          if (nestedTag.fullTag) handleTagSelect(nestedTag.fullTag, group)
        }}
        indent
      />
    )
  }

  return createPortal(dropdown, document.body)
}

// ─── UI Primitives ──────────────────────────────────────────────────────────

function TagIcon({ letter, color }: { letter: string; color: string }) {
  return (
    <div
      className="flex h-[14px] w-[14px] flex-shrink-0 items-center justify-center rounded"
      style={{ background: color }}
    >
      <span className="text-white font-bold text-[10px]">{letter}</span>
    </div>
  )
}

function TagListItem({
  label,
  typeLabel,
  isSelected,
  onMouseEnter,
  onMouseDown,
  icon,
  suffix,
  isBold,
  indent,
}: {
  label: string
  typeLabel?: string
  isSelected: boolean
  onMouseEnter: () => void
  onMouseDown: (e: React.MouseEvent) => void
  icon?: React.ReactNode
  suffix?: React.ReactNode
  isBold?: boolean
  indent?: boolean
}) {
  return (
    <button
      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
      style={{
        color: 'rgba(255,255,255,0.9)',
        background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
        paddingLeft: indent ? '24px' : '12px',
        fontWeight: isBold ? 500 : 400,
      }}
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
    >
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      {typeLabel && (
        <span className="ml-auto text-[10px] text-white/40">{typeLabel}</span>
      )}
      {suffix}
    </button>
  )
}

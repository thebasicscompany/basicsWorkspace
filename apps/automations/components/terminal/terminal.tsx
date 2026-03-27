'use client'

import type React from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLineDown,
  ArrowUp,
  CaretDown,
  DotsThree,
  Trash,
} from '@phosphor-icons/react'
import { TERMINAL_HEIGHT } from '@/apps/automations/stores/constants'
import type { ConsoleEntry } from '@/apps/automations/stores/terminal'
import { useTerminalConsoleStore, useTerminalStore } from '@/apps/automations/stores/terminal'
import { useWorkflowRegistry } from '@/apps/automations/stores/registry'
import { useTerminalResize } from './hooks/use-terminal-resize'
import { useTerminalFilters } from './hooks/use-terminal-filters'
import { useOutputPanelResize } from './hooks/use-output-panel-resize'
import {
  collectExpandableNodeIds,
  type EntryNode,
  type ExecutionGroup,
  flattenBlockEntriesOnly,
  getBlockColor,
  getBlockIcon,
  groupEntriesByExecution,
  isEventFromEditableElement,
  type NavigableBlockEntry,
  TERMINAL_CONFIG,
} from './utils'
import { ROW_STYLES } from './types'

const MIN_HEIGHT = TERMINAL_HEIGHT.MIN
const DEFAULT_EXPANDED_HEIGHT = TERMINAL_HEIGHT.DEFAULT

const MAX_TREE_DEPTH = 50

function hasMatchInTree(
  nodes: EntryNode[],
  predicate: (e: ConsoleEntry) => boolean,
  depth = 0
): boolean {
  if (depth >= MAX_TREE_DEPTH) return false
  return nodes.some((n) => predicate(n.entry) || hasMatchInTree(n.children, predicate, depth + 1))
}

const hasErrorInTree = (nodes: EntryNode[]) => hasMatchInTree(nodes, (e) => Boolean(e.error))
const hasRunningInTree = (nodes: EntryNode[]) => hasMatchInTree(nodes, (e) => Boolean(e.isRunning))

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

/**
 * Block row component for displaying actual block entries
 */
const BlockRow = memo(function BlockRow({
  entry,
  isSelected,
  onSelect,
}: {
  entry: ConsoleEntry
  isSelected: boolean
  onSelect: (entry: ConsoleEntry) => void
}) {
  const BlockIcon = getBlockIcon(entry.blockType)
  const hasError = Boolean(entry.error)
  const bgColor = getBlockColor(entry.blockType)

  return (
    <div
      className={`${ROW_STYLES.base} h-[30px] ${isSelected ? ROW_STYLES.selected : ROW_STYLES.hover}`}
      onClick={() => onSelect(entry)}
    >
      <div className="flex min-w-0 items-center gap-[6px]">
        <div
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px]"
          style={{ backgroundColor: bgColor + '20' }}
        >
          {BlockIcon && (
            <span style={{ color: bgColor }}>
              <BlockIcon className="h-[12px] w-[12px]" />
            </span>
          )}
        </div>
        <span className="truncate text-[13px] text-[var(--color-text-primary)]">
          {entry.blockName}
        </span>
        {hasError && (
          <span className="rounded-[4px] bg-red-100 px-[4px] text-[11px] text-red-600">Error</span>
        )}
      </div>
      <div className="flex items-center gap-[4px] text-[12px] text-[var(--color-text-tertiary)]">
        {entry.isRunning ? (
          <span className="rounded-[4px] bg-green-100 px-[4px] text-[11px] text-green-700">Running</span>
        ) : entry.isCanceled ? (
          <span>canceled</span>
        ) : entry.durationMs !== undefined ? (
          <span>{formatDuration(entry.durationMs)}</span>
        ) : null}
      </div>
    </div>
  )
})

/**
 * Subflow/iteration row component
 */
const SubflowRow = memo(function SubflowRow({
  node,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onSelectEntry,
  depth,
}: {
  node: EntryNode
  isExpanded: boolean
  isSelected: boolean
  onToggle: (id: string) => void
  onSelect: (entry: ConsoleEntry) => void
  onSelectEntry: (entry: ConsoleEntry) => void
  depth: number
}) {
  const entry = node.entry
  const bgColor = getBlockColor(entry.blockType)
  const hasError = hasErrorInTree([node])
  const isRunning = hasRunningInTree([node])

  return (
    <div>
      <div
        className={`${ROW_STYLES.base} h-[30px] ${isSelected ? ROW_STYLES.selected : ROW_STYLES.hover}`}
        onClick={() => {
          onSelect(entry)
          onToggle(entry.id)
        }}
      >
        <div className="flex min-w-0 items-center gap-[6px]">
          <CaretDown
            className={`h-[12px] w-[12px] shrink-0 transition-transform duration-100 ${!isExpanded ? '-rotate-90' : ''}`}
            weight="bold"
          />
          <div
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px]"
            style={{ backgroundColor: bgColor + '20' }}
          >
            <div className="h-[8px] w-[8px] rounded-full" style={{ backgroundColor: bgColor }} />
          </div>
          <span className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
            {entry.blockName}
          </span>
          {hasError && (
            <span className="rounded-[4px] bg-red-100 px-[4px] text-[11px] text-red-600">Error</span>
          )}
        </div>
        <div className="flex items-center gap-[4px] text-[12px] text-[var(--color-text-tertiary)]">
          {isRunning ? (
            <span className="rounded-[4px] bg-green-100 px-[4px] text-[11px] text-green-700">Running</span>
          ) : entry.durationMs !== undefined ? (
            <span>{formatDuration(entry.durationMs)}</span>
          ) : null}
        </div>
      </div>
      {isExpanded && node.children.length > 0 && (
        <div className={ROW_STYLES.nested}>
          {node.children.map((child) => (
            <TreeNode
              key={child.entry.id}
              node={child}
              selectedEntryId={isSelected ? entry.id : undefined}
              expandedNodeIds={new Set()}
              onToggle={onToggle}
              onSelect={onSelectEntry}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
})

/**
 * Generic tree node renderer
 */
function TreeNode({
  node,
  selectedEntryId,
  expandedNodeIds,
  onToggle,
  onSelect,
  depth,
}: {
  node: EntryNode
  selectedEntryId?: string
  expandedNodeIds: Set<string>
  onToggle: (id: string) => void
  onSelect: (entry: ConsoleEntry) => void
  depth: number
}) {
  if (depth > MAX_TREE_DEPTH) return null
  const isSelected = selectedEntryId === node.entry.id
  const isExpanded = expandedNodeIds.has(node.entry.id)

  if (node.nodeType === 'block') {
    return <BlockRow entry={node.entry} isSelected={isSelected} onSelect={onSelect} />
  }

  return (
    <SubflowRow
      node={node}
      isExpanded={isExpanded}
      isSelected={isSelected}
      onToggle={onToggle}
      onSelect={onSelect}
      onSelectEntry={onSelect}
      depth={depth}
    />
  )
}

/**
 * Execution group row component
 */
const ExecutionGroupRow = memo(function ExecutionGroupRow({
  group,
  isExpanded,
  onToggle,
  selectedEntryId,
  expandedNodeIds,
  onToggleNode,
  onSelectEntry,
}: {
  group: ExecutionGroup
  isExpanded: boolean
  onToggle: () => void
  selectedEntryId?: string
  expandedNodeIds: Set<string>
  onToggleNode: (id: string) => void
  onSelectEntry: (entry: ConsoleEntry) => void
}) {
  const hasError = group.status === 'error'
  const isRunning = group.entries.some((e) => e.isRunning)

  return (
    <div>
      <div
        className={`${ROW_STYLES.base} h-[32px] ${ROW_STYLES.hover}`}
        onClick={onToggle}
      >
        <div className="flex min-w-0 items-center gap-[6px]">
          <CaretDown
            className={`h-[12px] w-[12px] shrink-0 transition-transform duration-100 ${!isExpanded ? '-rotate-90' : ''}`}
            weight="bold"
          />
          <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
            Run
          </span>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">
            {group.entries.length} block{group.entries.length !== 1 ? 's' : ''}
          </span>
          {hasError && (
            <span className="rounded-[4px] bg-red-100 px-[4px] text-[11px] text-red-600">Error</span>
          )}
        </div>
        <div className="flex items-center gap-[4px] text-[12px] text-[var(--color-text-tertiary)]">
          {isRunning ? (
            <span className="rounded-[4px] bg-green-100 px-[4px] text-[11px] text-green-700">Running</span>
          ) : (
            <span>{formatDuration(group.duration)}</span>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className={ROW_STYLES.nested}>
          {group.entryTree.map((node) => (
            <TreeNode
              key={node.entry.id}
              node={node}
              selectedEntryId={selectedEntryId}
              expandedNodeIds={expandedNodeIds}
              onToggle={onToggleNode}
              onSelect={onSelectEntry}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  )
})

/**
 * Output panel for showing selected entry details
 */
const OutputPanel = memo(function OutputPanel({
  entry,
  width,
  onResizeStart,
}: {
  entry: ConsoleEntry | null
  width: number
  onResizeStart: () => void
}) {
  if (!entry) {
    return (
      <div
        className="flex h-full items-center justify-center border-l border-[var(--color-border)] bg-[var(--color-bg-surface)]"
        style={{ width, minWidth: width }}
      >
        <span className="text-[13px] text-[var(--color-text-tertiary)]">
          Select an entry to view output
        </span>
      </div>
    )
  }

  const output = entry.output
  let displayContent: string
  try {
    displayContent = typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output ?? '')
  } catch {
    displayContent = String(output)
  }

  return (
    <div
      className="relative flex h-full flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-surface)]"
      style={{ width, minWidth: width }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 z-10 h-full w-[3px] cursor-ew-resize hover:bg-[var(--color-accent)]"
        onMouseDown={onResizeStart}
      />
      {/* Header */}
      <div className="flex h-[32px] items-center justify-between border-b border-[var(--color-border)] px-[12px]">
        <div className="flex items-center gap-[6px]">
          <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
            {entry.blockName}
          </span>
          {entry.error ? (
            <span className="rounded-[4px] bg-red-100 px-[4px] text-[11px] text-red-600">Error</span>
          ) : entry.success !== false ? (
            <span className="rounded-[4px] bg-green-100 px-[4px] text-[11px] text-green-700">Success</span>
          ) : null}
        </div>
        {entry.durationMs !== undefined && (
          <span className="text-[12px] text-[var(--color-text-tertiary)]">
            {formatDuration(entry.durationMs)}
          </span>
        )}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto p-[12px]">
        {entry.error ? (
          <div className="rounded-[8px] bg-red-50 p-[12px]">
            <pre className="whitespace-pre-wrap break-words text-[12px] text-red-700">
              {String(entry.error)}
            </pre>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words text-[12px] text-[var(--color-text-primary)] font-mono">
            {displayContent || '(no output)'}
          </pre>
        )}
        {entry.input && (
          <div className="mt-[12px] border-t border-[var(--color-border)] pt-[12px]">
            <span className="mb-[4px] block text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">
              Input
            </span>
            <pre className="whitespace-pre-wrap break-words text-[12px] text-[var(--color-text-secondary)] font-mono">
              {typeof entry.input === 'object' ? JSON.stringify(entry.input, null, 2) : String(entry.input)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
})

/**
 * Terminal component — shows execution results below the canvas.
 * Data layer is 1:1 from Sim (stores, utils, hooks). UI uses our design system.
 */
export function Terminal({ workflowId }: { workflowId: string }) {
  const isOpen = useTerminalConsoleStore((s) => s.isOpen)
  const toggleConsole = useTerminalConsoleStore((s) => s.toggleConsole)
  const clearWorkflowConsole = useTerminalConsoleStore((s) => s.clearWorkflowConsole)
  const entries = useTerminalConsoleStore((s) => s.entries)

  const terminalHeight = useTerminalStore((s) => s.terminalHeight)
  const setTerminalHeight = useTerminalStore((s) => s.setTerminalHeight)
  const lastExpandedHeight = useTerminalStore((s) => s.lastExpandedHeight)
  const outputPanelWidth = useTerminalStore((s) => s.outputPanelWidth)

  const { isResizing: isVerticalResizing, handleMouseDown: handleVerticalResizeStart } = useTerminalResize()
  const { isResizing: isHorizontalResizing, handleMouseDown: handleHorizontalResizeStart } = useOutputPanelResize()
  const { filterEntries, hasActiveFilters, clearFilters } = useTerminalFilters()

  const [selectedEntry, setSelectedEntry] = useState<ConsoleEntry | null>(null)
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set())
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)

  // Filter to current workflow
  const workflowEntries = useMemo(
    () => entries.filter((e) => e.workflowId === workflowId),
    [entries, workflowId]
  )

  // Group and build trees
  const executionGroups = useMemo(
    () => groupEntriesByExecution(filterEntries(workflowEntries)),
    [workflowEntries, filterEntries]
  )

  // Auto-expand new executions and their nodes
  useEffect(() => {
    if (executionGroups.length > 0) {
      const latestGroup = executionGroups[0]
      setExpandedExecutions((prev) => {
        const next = new Set(prev)
        next.add(latestGroup.executionId)
        return next
      })
      const nodeIds = collectExpandableNodeIds(latestGroup.entryTree)
      if (nodeIds.length > 0) {
        setExpandedNodes((prev) => {
          const next = new Set(prev)
          for (const id of nodeIds) next.add(id)
          return next
        })
      }
    }
  }, [executionGroups])

  // Scroll to bottom on new entries
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [workflowEntries.length])

  const toggleExecution = useCallback((executionId: string) => {
    setExpandedExecutions((prev) => {
      const next = new Set(prev)
      if (next.has(executionId)) next.delete(executionId)
      else next.add(executionId)
      return next
    })
  }, [])

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  const handleToggleOpen = useCallback(() => {
    if (!isOpen) {
      if (terminalHeight <= MIN_HEIGHT + 10) {
        setTerminalHeight(lastExpandedHeight || DEFAULT_EXPANDED_HEIGHT)
      }
    }
    toggleConsole()
  }, [isOpen, terminalHeight, lastExpandedHeight, setTerminalHeight, toggleConsole])

  const isNearMin = terminalHeight <= TERMINAL_CONFIG.NEAR_MIN_THRESHOLD
  const showContent = isOpen && !isNearMin

  const entryCount = workflowEntries.length
  const hasEntries = entryCount > 0

  return (
    <div
      aria-label="Terminal"
      className="flex flex-col border-t border-[var(--color-border)] bg-[var(--color-bg-surface)]"
      style={{ height: isOpen ? terminalHeight : 30 }}
    >
      {/* Resize handle */}
      {isOpen && (
        <div
          className="h-[3px] cursor-ns-resize hover:bg-[var(--color-accent)] active:bg-[var(--color-accent)]"
          onMouseDown={handleVerticalResizeStart}
        />
      )}

      {/* Header bar */}
      <div className="flex h-[30px] shrink-0 items-center justify-between border-b border-[var(--color-border)] px-[12px]">
        <div className="flex items-center gap-[8px]">
          <button
            onClick={handleToggleOpen}
            className="flex items-center gap-[4px] text-[13px] font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)]"
          >
            <CaretDown
              className={`h-[12px] w-[12px] transition-transform duration-100 ${!isOpen ? '-rotate-90' : ''}`}
              weight="bold"
            />
            Terminal
          </button>
          {hasEntries && (
            <span className="text-[12px] text-[var(--color-text-tertiary)]">
              {entryCount} entr{entryCount === 1 ? 'y' : 'ies'}
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[11px] text-[var(--color-accent)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="flex items-center gap-[4px]">
          {hasEntries && (
            <button
              onClick={() => clearWorkflowConsole(workflowId)}
              className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-secondary)]"
              title="Clear console"
            >
              <Trash className="h-[14px] w-[14px]" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {showContent && (
        <div className="flex flex-1 overflow-hidden">
          {/* Entry list */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-[4px] py-[4px]">
            {!hasEntries ? (
              <div className="flex h-full items-center justify-center">
                <span className="text-[13px] text-[var(--color-text-tertiary)]">
                  Run a workflow to see results
                </span>
              </div>
            ) : (
              executionGroups.map((group) => (
                <ExecutionGroupRow
                  key={group.executionId}
                  group={group}
                  isExpanded={expandedExecutions.has(group.executionId)}
                  onToggle={() => toggleExecution(group.executionId)}
                  selectedEntryId={selectedEntry?.id}
                  expandedNodeIds={expandedNodes}
                  onToggleNode={toggleNode}
                  onSelectEntry={setSelectedEntry}
                />
              ))
            )}
          </div>

          {/* Output panel */}
          {selectedEntry && (
            <OutputPanel
              entry={selectedEntry}
              width={outputPanelWidth}
              onResizeStart={handleHorizontalResizeStart}
            />
          )}
        </div>
      )}
    </div>
  )
}

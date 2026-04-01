'use client'

import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { Handle, type NodeProps, Position, useUpdateNodeInternals } from 'reactflow'
import { Lightning } from '@phosphor-icons/react'
import isEqual from 'lodash/isEqual'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { getBlock } from '@/lib/sim/blocks'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import { getDependsOnFields } from '@/lib/sim/blocks/utils'
import { cn } from '@/lib/utils'
import { BLOCK_DIMENSIONS, HANDLE_POSITIONS } from '@/lib/workflows/blocks/block-dimensions'
import { getConditionRows, getRouterRows } from '@/lib/workflows/dynamic-handle-topology'
import {
  buildCanonicalIndex,
  evaluateSubBlockCondition,
  hasAdvancedValues,
  isSubBlockFeatureEnabled,
  isSubBlockHiddenByHostedKey,
  isSubBlockVisibleForMode,
  resolveDependencyValue,
} from '@/lib/workflows/subblocks/visibility'
import { useWorkflowRegistry } from '@/apps/automations/stores/registry'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'
import { useWorkflowStore } from '@/apps/automations/stores/workflow'
import { useLastRunPath } from '@/apps/automations/stores/execution'
import { wouldCreateCycle } from '@/apps/automations/stores/workflows/edge-validation'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BlockNodeData {
  type: string
  name: string
  enabled?: boolean
}

// ─── Display value helpers ──────────────────────────────────────────────────

const tryParseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  try {
    const trimmed = value.trim()
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      return JSON.parse(trimmed)
    }
  } catch {
    // Not valid JSON
  }
  return value
}

const isMessagesArray = (value: unknown): value is Array<{ role: string; content: string }> =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (item) =>
      typeof item === 'object' && item !== null && 'role' in item && 'content' in item
  )

const isFieldFormatArray = (value: unknown): value is Array<{ id: string; name: string }> =>
  Array.isArray(value) &&
  value.length > 0 &&
  typeof value[0] === 'object' &&
  value[0] !== null &&
  'id' in value[0] &&
  'name' in value[0]

const isTableRowArray = (
  value: unknown
): value is Array<{ id: string; cells: Record<string, string> }> =>
  Array.isArray(value) &&
  value.length > 0 &&
  typeof value[0] === 'object' &&
  value[0] !== null &&
  'id' in value[0] &&
  'cells' in value[0]

export function getDisplayValue(value: unknown): string {
  if (value == null || value === '') return '-'
  const parsed = tryParseJson(value)

  if (isMessagesArray(parsed)) {
    const first = parsed[0]
    if (!first?.content?.trim()) return '-'
    const c = first.content.trim()
    return c.length > 50 ? `${c.slice(0, 50)}...` : c
  }

  if (isFieldFormatArray(parsed)) {
    const named = parsed.filter((f) => f.name?.trim())
    if (!named.length) return '-'
    if (named.length <= 2) return named.map((f) => f.name).join(', ')
    return `${named[0].name}, ${named[1].name} +${named.length - 2}`
  }

  if (isTableRowArray(parsed)) {
    const nonEmpty = parsed.filter((r) =>
      Object.values(r.cells).some((c) => c?.trim())
    )
    if (!nonEmpty.length) return '-'
    return nonEmpty.length === 1
      ? Object.entries(nonEmpty[0].cells)
          .filter(([, v]) => v?.trim())
          .slice(0, 2)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
      : `${nonEmpty.length} rows`
  }

  if (Array.isArray(parsed)) {
    const items = parsed.filter((i) => i != null && i !== '')
    if (!items.length) return '-'
    return `${items.length} item${items.length > 1 ? 's' : ''}`
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const entries = Object.entries(parsed).filter(([, v]) => v != null && v !== '')
    if (!entries.length) return '-'
    const preview = entries
      .slice(0, 2)
      .map(([k]) => k)
      .join(', ')
    return entries.length > 2 ? `${preview} +${entries.length - 2}` : preview
  }

  const s = String(value)
  return s.trim().length > 0 ? (s.length > 60 ? `${s.slice(0, 57)}...` : s) : '-'
}

// ─── SubBlockRow ────────────────────────────────────────────────────────────

const SubBlockRow = memo(function SubBlockRow({
  title,
  value,
  subBlock,
  rawValue,
  allSubBlockValues,
  canonicalIndex,
  canonicalModes,
}: {
  title: string
  value?: string
  subBlock?: SubBlockConfig
  rawValue?: unknown
  allSubBlockValues?: Record<string, { value: unknown }>
  canonicalIndex?: ReturnType<typeof buildCanonicalIndex>
  canonicalModes?: Record<string, 'basic' | 'advanced'>
}) {
  // Resolve dropdown labels
  const dropdownLabel = useMemo(() => {
    if (!subBlock || (subBlock.type !== 'dropdown' && subBlock.type !== 'combobox')) return null
    if (!rawValue || typeof rawValue !== 'string') return null
    const options = typeof subBlock.options === 'function' ? subBlock.options() : subBlock.options
    if (!options) return null
    const opt = options.find((o) => (typeof o === 'string' ? o === rawValue : o.id === rawValue))
    if (!opt) return null
    return typeof opt === 'string' ? opt : opt.label
  }, [subBlock, rawValue])

  const isPasswordField = subBlock?.password === true
  const maskedValue = isPasswordField && value && value !== '-' ? '•••' : null
  const displayValue = maskedValue || dropdownLabel || value

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="min-w-0 shrink-0 text-[11px] font-medium capitalize text-text-tertiary" title={title}>
        {title}
      </span>
      {displayValue !== undefined && (
        <span className="flex-1 truncate text-right text-[11px] text-text-secondary" title={displayValue}>
          {displayValue}
        </span>
      )}
    </div>
  )
})

// ─── Handle helpers ─────────────────────────────────────────────────────────

const getHandleClasses = (position: 'left' | 'right' | 'top' | 'bottom', isError = false) => {
  const base = '!z-[30] !cursor-crosshair !border-none !transition-[colors] !duration-150'
  const color = isError ? '!bg-red-500' : '!bg-[var(--color-accent)]'
  const pos = {
    left: '!left-[-8px] !h-5 !w-[7px] !rounded-l-[2px] !rounded-r-none hover:!left-[-11px] hover:!w-[10px] hover:!rounded-l-full',
    right:
      '!right-[-8px] !h-5 !w-[7px] !rounded-r-[2px] !rounded-l-none hover:!right-[-11px] hover:!w-[10px] hover:!rounded-r-full',
    top: '!top-[-8px] !h-[7px] !w-5 !rounded-t-[2px] !rounded-b-none hover:!top-[-11px] hover:!h-[10px] hover:!rounded-t-full',
    bottom:
      '!bottom-[-8px] !h-[7px] !w-5 !rounded-b-[2px] !rounded-t-none hover:!bottom-[-11px] hover:!h-[10px] hover:!rounded-b-full',
  }
  return cn(base, color, pos[position])
}

const getHandleStyle = (position: 'horizontal' | 'vertical') =>
  position === 'horizontal'
    ? { top: `${HANDLE_POSITIONS.DEFAULT_Y_OFFSET}px`, transform: 'translateY(-50%)' }
    : { left: '50%', transform: 'translateX(-50%)' }

// ─── Main component ─────────────────────────────────────────────────────────

export const WorkflowBlockNode = memo(function WorkflowBlockNode({
  id,
  data,
  selected,
}: NodeProps<BlockNodeData>) {
  const { type, name, enabled } = data
  const blockConfig = useMemo(() => getBlock(type), [type])
  const rawBgColor = blockConfig?.bgColor ?? '#2D8653'
  // For icon background, use the raw value (CSS vars work here)
  const iconBgColor = rawBgColor
  // For border alpha (hex + '40'), CSS vars don't work — resolve to fallback
  const borderColor = rawBgColor.startsWith('var(') ? '#2D8653' : rawBgColor
  const BlockIcon = blockConfig?.icon

  const isEnabled = enabled !== false
  const horizontalHandles = true // Our blocks always use horizontal handles

  // ── Store subscriptions ──────────────────────────────────────────────────

  const activeWorkflowId = useWorkflowRegistry((s) => s.activeWorkflowId)

  const blockSubBlockValues = useStoreWithEqualityFn(
    useSubBlockStore,
    useCallback(
      (state) => {
        if (!activeWorkflowId) return {} as Record<string, any>
        return state.workflowValues[activeWorkflowId]?.[id] ?? ({} as Record<string, any>)
      },
      [activeWorkflowId, id]
    ),
    isEqual
  )

  const storeBlock = useWorkflowStore(
    useCallback(
      (state) => state.blocks[id],
      [id]
    )
  )

  const lastRunPath = useLastRunPath()
  const runPathStatus = lastRunPath.get(id)

  // ── Subblock visibility logic (ported from Sim) ──────────────────────────

  const canonicalIndex = useMemo(
    () => buildCanonicalIndex(blockConfig?.subBlocks ?? []),
    [blockConfig?.subBlocks]
  )
  const canonicalModes = storeBlock?.data?.canonicalModes as
    | Record<string, 'basic' | 'advanced'>
    | undefined

  const displayAdvancedMode = storeBlock?.advancedMode ?? false
  const displayTriggerMode = storeBlock?.triggerMode ?? false

  const { rows: subBlockRows, stateToUse: subBlockState } = useMemo(() => {
    if (!blockConfig) return { rows: [] as SubBlockConfig[][], stateToUse: {} as Record<string, { value: unknown }> }

    const stateToUse = Object.entries(blockSubBlockValues).reduce(
      (acc, [key, value]) => {
        acc[key] = { value }
        return acc
      },
      {} as Record<string, { value: unknown }>
    )

    const rawValues = Object.entries(stateToUse).reduce<Record<string, unknown>>(
      (acc, [key, entry]) => {
        acc[key] = entry?.value
        return acc
      },
      {}
    )

    const effectiveAdvanced = displayAdvancedMode || hasAdvancedValues(blockConfig.subBlocks, rawValues, canonicalIndex)
    const effectiveTrigger = displayTriggerMode

    const visibleSubBlocks = blockConfig.subBlocks.filter((block) => {
      if (block.hidden || block.hideFromPreview) return false
      if (!isSubBlockFeatureEnabled(block)) return false
      if (isSubBlockHiddenByHostedKey(block)) return false

      const isPureTriggerBlock = blockConfig?.triggers?.enabled && blockConfig.category === 'triggers'
      if (effectiveTrigger) {
        const isValidTriggerSubblock = isPureTriggerBlock
          ? block.mode === 'trigger' || !block.mode
          : block.mode === 'trigger'
        if (!isValidTriggerSubblock) return false
      } else {
        if (block.mode === 'trigger') return false
      }

      if (!isSubBlockVisibleForMode(block, effectiveAdvanced, canonicalIndex, rawValues, canonicalModes)) {
        return false
      }
      if (!block.condition) return true
      return evaluateSubBlockCondition(block.condition, rawValues)
    })

    const rows: SubBlockConfig[][] = []
    let currentRow: SubBlockConfig[] = []
    for (const block of visibleSubBlocks) {
      currentRow.push(block)
      rows.push([...currentRow])
      currentRow = []
    }
    if (currentRow.length > 0) rows.push(currentRow)

    return { rows, stateToUse }
  }, [blockConfig, blockSubBlockValues, displayAdvancedMode, displayTriggerMode, canonicalIndex, canonicalModes])

  // ── Topology rows for condition/router blocks ────────────────────────────

  const topologySubBlocks = storeBlock?.subBlocks ?? {}

  const conditionRows = useMemo(() => {
    if (type !== 'condition') return [] as { id: string; title: string; value: string }[]
    return getConditionRows(id, topologySubBlocks.conditions?.value)
  }, [type, topologySubBlocks, id])

  const routerRows = useMemo(() => {
    if (type !== 'router') return [] as { id: string; value: string }[]
    return getRouterRows(id, topologySubBlocks.routes?.value)
  }, [type, topologySubBlocks, id])

  // ── Layout computation ───────────────────────────────────────────────────

  const isStarterOrTrigger = blockConfig?.category === 'triggers' || type === 'starter'
  const shouldShowDefaultHandles = !isStarterOrTrigger && !displayTriggerMode
  const hasContentBelowHeader = subBlockRows.length > 0 || shouldShowDefaultHandles

  // Notify ReactFlow when handle orientation changes
  const updateNodeInternals = useUpdateNodeInternals()
  useEffect(() => {
    updateNodeInternals(id)
  }, [horizontalHandles, id, updateNodeInternals])

  // ── Ring / selection / execution status ──────────────────────────────────

  const getRingStyle = (): string | undefined => {
    if (selected) return `0 0 0 2px ${borderColor}`
    if (runPathStatus === 'success') return '0 0 0 2px var(--color-success)'
    if (runPathStatus === 'error') return '0 0 0 2px var(--color-error)'
    return undefined
  }

  // ── Connection validator ─────────────────────────────────────────────────

  const validateConnection = useCallback(
    (connection: { source: string | null; target: string | null }) => {
      // Prevent self-connections
      if (connection.source === connection.target) return false
      if (!connection.source || !connection.target) return false
      const edges = useWorkflowStore.getState().edges
      return !wouldCreateCycle(connection.source, connection.target, edges)
    },
    []
  )

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="group relative">
      <div
        className={cn(
          'workflow-drag-handle relative z-[20] w-[250px] cursor-grab select-none rounded-lg bg-bg-surface shadow-sm [&:active]:cursor-grabbing',
          !isEnabled && 'opacity-50'
        )}
        style={{
          border: `1.5px solid ${isEnabled ? borderColor + '40' : 'var(--color-border)'}`,
          boxShadow: getRingStyle(),
        }}
      >
        {/* Target handle */}
        {shouldShowDefaultHandles && (
          <Handle
            type="target"
            position={horizontalHandles ? Position.Left : Position.Top}
            id="target"
            className={getHandleClasses(horizontalHandles ? 'left' : 'top')}
            style={getHandleStyle(horizontalHandles ? 'horizontal' : 'vertical')}
            isConnectableStart={false}
            isConnectableEnd={true}
            isValidConnection={validateConnection}
          />
        )}

        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between px-2.5 py-2',
            hasContentBelowHeader && 'border-b border-border'
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
              style={{ background: isEnabled ? iconBgColor : 'var(--color-text-tertiary)' }}
            >
              {BlockIcon ? (
                <BlockIcon className="h-4 w-4 text-white" />
              ) : (
                <Lightning size={16} weight="fill" className="text-white" />
              )}
            </div>
            <span
              className={cn('truncate font-medium text-[13px] text-text-primary', !isEnabled && 'opacity-50')}
              title={name}
            >
              {name}
            </span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            {!isEnabled && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                disabled
              </span>
            )}
          </div>
        </div>

        {/* Content rows */}
        {hasContentBelowHeader && (
          <div className="flex flex-col gap-1 px-2.5 py-2">
            {type === 'condition' ? (
              conditionRows.map((cond) => (
                <SubBlockRow key={cond.id} title={cond.title} value={getDisplayValue(cond.value)} />
              ))
            ) : type === 'router' ? (
              <>
                <SubBlockRow
                  key="context"
                  title="Context"
                  value={getDisplayValue(subBlockState.context?.value)}
                />
                {routerRows.map((route, i) => (
                  <SubBlockRow
                    key={route.id}
                    title={`Route ${i + 1}`}
                    value={getDisplayValue(route.value)}
                  />
                ))}
              </>
            ) : (
              subBlockRows.map((row, rowIndex) =>
                row.map((subBlock) => {
                  const rawValue = subBlockState[subBlock.id]?.value
                  return (
                    <SubBlockRow
                      key={`${subBlock.id}-${rowIndex}`}
                      title={subBlock.title ?? subBlock.id}
                      value={getDisplayValue(rawValue)}
                      subBlock={subBlock}
                      rawValue={rawValue}
                      allSubBlockValues={subBlockState}
                      canonicalIndex={canonicalIndex}
                      canonicalModes={canonicalModes}
                    />
                  )
                })
              )
            )}
            {shouldShowDefaultHandles && <SubBlockRow title="error" />}
          </div>
        )}

        {/* ── Condition block handles ── */}
        {type === 'condition' && (
          <>
            {conditionRows.map((cond, i) => {
              const topOffset =
                HANDLE_POSITIONS.CONDITION_START_Y + i * HANDLE_POSITIONS.CONDITION_ROW_HEIGHT
              return (
                <Handle
                  key={`handle-${cond.id}`}
                  type="source"
                  position={Position.Right}
                  id={`condition-${cond.id}`}
                  className={getHandleClasses('right')}
                  style={{ top: `${topOffset}px`, transform: 'translateY(-50%)' }}
                  isConnectableStart={true}
                  isConnectableEnd={false}
                  isValidConnection={validateConnection}
                />
              )
            })}
            <Handle
              type="source"
              position={Position.Right}
              id="error"
              className={getHandleClasses('right', true)}
              style={{
                right: '-7px',
                top: 'auto',
                bottom: `${HANDLE_POSITIONS.ERROR_BOTTOM_OFFSET}px`,
                transform: 'translateY(50%)',
              }}
              isConnectableStart={true}
              isConnectableEnd={false}
              isValidConnection={validateConnection}
            />
          </>
        )}

        {/* ── Router block handles ── */}
        {type === 'router' && (
          <>
            {routerRows.map((route, i) => {
              const topOffset =
                HANDLE_POSITIONS.CONDITION_START_Y + (i + 1) * HANDLE_POSITIONS.CONDITION_ROW_HEIGHT
              return (
                <Handle
                  key={`handle-${route.id}`}
                  type="source"
                  position={Position.Right}
                  id={`router-${route.id}`}
                  className={getHandleClasses('right')}
                  style={{ top: `${topOffset}px`, transform: 'translateY(-50%)' }}
                  isConnectableStart={true}
                  isConnectableEnd={false}
                  isValidConnection={validateConnection}
                />
              )
            })}
            <Handle
              type="source"
              position={Position.Right}
              id="error"
              className={getHandleClasses('right', true)}
              style={{
                right: '-7px',
                top: 'auto',
                bottom: `${HANDLE_POSITIONS.ERROR_BOTTOM_OFFSET}px`,
                transform: 'translateY(50%)',
              }}
              isConnectableStart={true}
              isConnectableEnd={false}
              isValidConnection={validateConnection}
            />
          </>
        )}

        {/* ── Default source + error handles ── */}
        {type !== 'condition' && type !== 'router' && type !== 'response' && (
          <>
            <Handle
              type="source"
              position={horizontalHandles ? Position.Right : Position.Bottom}
              id="source"
              className={getHandleClasses(horizontalHandles ? 'right' : 'bottom')}
              style={getHandleStyle(horizontalHandles ? 'horizontal' : 'vertical')}
              isConnectableStart={true}
              isConnectableEnd={false}
              isValidConnection={validateConnection}
            />
            {shouldShowDefaultHandles && (
              <Handle
                type="source"
                position={Position.Right}
                id="error"
                className={getHandleClasses('right', true)}
                style={{
                  right: '-7px',
                  top: 'auto',
                  bottom: `${HANDLE_POSITIONS.ERROR_BOTTOM_OFFSET}px`,
                  transform: 'translateY(50%)',
                }}
                isConnectableStart={true}
                isConnectableEnd={false}
                isValidConnection={validateConnection}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
})

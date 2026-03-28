'use client'

import { memo, useMemo } from 'react'
import { ArrowsClockwise, GitFork } from '@phosphor-icons/react'
import { Handle, type NodeProps, Position, useReactFlow } from 'reactflow'
import { cn } from '@/lib/utils'
import { HANDLE_POSITIONS } from '@/lib/workflows/blocks/block-dimensions'
import { useLastRunPath, type BlockRunStatus } from '@/apps/automations/stores/execution'

/**
 * Data structure for subflow nodes (loop and parallel containers)
 */
export interface SubflowNodeData {
  width?: number
  height?: number
  parentId?: string
  extent?: 'parent'
  isPreview?: boolean
  /** Whether this subflow is selected in preview mode */
  isPreviewSelected?: boolean
  kind: 'loop' | 'parallel'
  name?: string
  /** Execution status passed by preview/snapshot views */
  executionStatus?: 'success' | 'error' | 'not-executed'
}

const HANDLE_STYLE = {
  top: `${HANDLE_POSITIONS.DEFAULT_Y_OFFSET}px`,
  transform: 'translateY(-50%)',
} as const

/**
 * Reusable class names for Handle components.
 * Matches the styling pattern from workflow-block.tsx.
 */
const getHandleClasses = (position: 'left' | 'right') => {
  const baseClasses = '!z-[10] !cursor-crosshair !border-none !transition-[colors] !duration-150'
  const colorClasses = '!bg-[var(--color-accent)]'

  const positionClasses = {
    left: '!left-[-8px] !h-5 !w-[7px] !rounded-l-[2px] !rounded-r-none hover:!left-[-11px] hover:!w-[10px] hover:!rounded-l-full',
    right:
      '!right-[-8px] !h-5 !w-[7px] !rounded-r-[2px] !rounded-l-none hover:!right-[-11px] hover:!w-[10px] hover:!rounded-r-full',
  }

  return cn(baseClasses, colorClasses, positionClasses[position])
}

/**
 * Subflow node component for loop and parallel execution containers.
 * Renders a resizable container with a header displaying the block name and icon,
 * handles for connections, and supports nested execution contexts.
 *
 * @param props - Node properties containing data and id
 * @returns Rendered subflow node component
 */
export const SubflowNodeComponent = memo(({ data, id, selected }: NodeProps<SubflowNodeData>) => {
  const { getNodes } = useReactFlow()

  const isEnabled = true // TODO: wire to block state when available
  const isLocked = false // TODO: wire to block state when available
  const isPreview = data?.isPreview || false

  const isPreviewSelected = data?.isPreviewSelected || false

  const lastRunPath = useLastRunPath()
  const executionStatus = data.executionStatus
  const runPathStatus: 'success' | 'error' | undefined =
    executionStatus === 'success' || executionStatus === 'error'
      ? executionStatus
      : isPreview
        ? undefined
        : lastRunPath.get(id)

  /**
   * Calculate the nesting level of this subflow node based on its parent hierarchy.
   * Used to apply appropriate styling for nested containers.
   */
  const nestingLevel = useMemo(() => {
    let level = 0
    let currentParentId = data?.parentId

    while (currentParentId) {
      level++
      const parentNode = getNodes().find((n) => n.id === currentParentId)
      if (!parentNode) break
      currentParentId = parentNode.data?.parentId
    }

    return level
  }, [data?.parentId, getNodes])

  const startHandleId = data.kind === 'loop' ? 'loop-start-source' : 'parallel-start-source'
  const endHandleId = data.kind === 'loop' ? 'loop-end-source' : 'parallel-end-source'
  const BlockIcon = data.kind === 'loop' ? ArrowsClockwise : GitFork
  const blockIconBg = data.kind === 'loop' ? '#2FB3FF' : '#FEE12B'
  const blockName = data.name || (data.kind === 'loop' ? 'Loop' : 'Parallel')

  /**
   * Determine the ring styling based on subflow state priority:
   * 1. Selected (shift-click/box) or preview selected - accent ring
   * 2. Run path status (execution result) - green/red ring
   */
  const isSelected = !isPreview && selected
  const hasRing = isSelected || isPreviewSelected || !!runPathStatus

  /**
   * Compute the ring color for the subflow selection indicator.
   * Uses boxShadow (not CSS outline) to match the ring styling of regular workflow blocks.
   * This works because ReactFlow renders child nodes as sibling divs at the viewport level
   * (not as DOM children), so children at zIndex 1000 don't clip the parent's boxShadow.
   */
  const getRingColor = (): string | undefined => {
    if (!hasRing) return undefined
    if (isSelected || isPreviewSelected) return 'var(--color-accent)'
    if (runPathStatus === 'success') {
      return executionStatus ? 'var(--color-accent)' : '#22c55e'
    }
    if (runPathStatus === 'error') return '#ef4444'
    return undefined
  }
  const ringColor = getRingColor()

  return (
    <div className='group pointer-events-none relative'>
      <div
        className='relative select-none rounded-[8px] transition-shadow'
        style={{
          width: data.width || 500,
          height: data.height || 300,
          overflow: 'visible',
          pointerEvents: 'none',
          border: '1px solid var(--color-border)',
          ...(ringColor && {
            boxShadow: `0 0 0 1.75px ${ringColor}`,
          }),
        }}
        data-node-id={id}
        data-type='subflowNode'
        data-nesting-level={nestingLevel}
        data-subflow-selected={isSelected || isPreviewSelected}
      >
        {/* Header Section */}
        <div
          className='workflow-drag-handle flex cursor-grab items-center justify-between rounded-t-[8px] py-[8px] pr-[12px] pl-[8px] [&:active]:cursor-grabbing'
          style={{
            pointerEvents: 'auto',
            background: 'var(--color-bg-sidebar)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className='flex min-w-0 flex-1 items-center gap-[10px]'>
            <div
              className='flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-[6px]'
              style={{ backgroundColor: isEnabled ? blockIconBg : 'gray' }}
            >
              <BlockIcon size={16} weight="bold" color="white" />
            </div>
            <span
              className={cn(
                'truncate font-medium text-[16px]',
                !isEnabled && 'opacity-50'
              )}
              style={{ color: 'var(--color-text-primary)' }}
              title={blockName}
            >
              {blockName}
            </span>
          </div>
          <div className='flex items-center gap-1'>
            {!isEnabled && (
              <span className='rounded px-1.5 py-0.5 text-[10px]' style={{ background: 'var(--color-bg-sidebar)', color: 'var(--color-text-secondary)' }}>
                disabled
              </span>
            )}
            {isLocked && (
              <span className='rounded px-1.5 py-0.5 text-[10px]' style={{ background: 'var(--color-bg-sidebar)', color: 'var(--color-text-secondary)' }}>
                locked
              </span>
            )}
          </div>
        </div>

        {/*
         * Subflow body background. Captures clicks to select the subflow.
         * Child nodes and edges are rendered as sibling divs at the viewport
         * level by ReactFlow (not as DOM children), so enabling pointer events
         * here doesn't block them.
         */}
        <div
          className='workflow-drag-handle absolute inset-0 top-[44px] cursor-grab rounded-b-[8px] [&:active]:cursor-grabbing'
          style={{
            pointerEvents: isPreview ? 'none' : 'auto',
            background: 'var(--color-bg-base)',
          }}
        />

        {!isPreview && (
          <div
            className='absolute right-[8px] bottom-[8px] z-20 flex h-[32px] w-[32px] cursor-se-resize items-center justify-center'
            style={{ pointerEvents: 'auto', color: 'var(--color-text-tertiary)' }}
          />
        )}

        <div
          className='relative h-[calc(100%-50px)] pt-[16px] pr-[80px] pb-[16px] pl-[16px]'
          data-dragarea='true'
          style={{ pointerEvents: 'none' }}
        >
          {/* Subflow Start */}
          <div
            className='absolute top-[16px] left-[16px] flex items-center justify-center rounded-[8px] px-[12px] py-[6px]'
            style={{
              pointerEvents: isPreview ? 'none' : 'auto',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-surface)',
            }}
            data-parent-id={id}
            data-node-role={`${data.kind}-start`}
            data-extent='parent'
          >
            <span className='font-medium text-[14px]' style={{ color: 'var(--color-text-primary)' }}>
              Start
            </span>

            <Handle
              type='source'
              position={Position.Right}
              id={startHandleId}
              className={getHandleClasses('right')}
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'auto',
              }}
              data-parent-id={id}
            />
          </div>
        </div>

        {/* Input handle on left middle */}
        <Handle
          type='target'
          position={Position.Left}
          className={getHandleClasses('left')}
          style={{
            ...HANDLE_STYLE,
            pointerEvents: 'auto',
          }}
        />

        {/* Output handle on right middle */}
        <Handle
          type='source'
          position={Position.Right}
          className={getHandleClasses('right')}
          style={{
            ...HANDLE_STYLE,
            pointerEvents: 'auto',
          }}
          id={endHandleId}
        />
      </div>
    </div>
  )
})

SubflowNodeComponent.displayName = 'SubflowNodeComponent'

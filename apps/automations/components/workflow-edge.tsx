'use client'

import { memo, useMemo } from 'react'
import { X } from '@phosphor-icons/react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from 'reactflow'
import { useLastRunEdges } from '@/apps/automations/stores/execution'

/** Extended edge props with optional handle identifiers */
interface WorkflowEdgeProps extends EdgeProps {
  sourceHandle?: string | null
  targetHandle?: string | null
}

const WorkflowEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  source,
  target,
  sourceHandle,
  targetHandle,
}: WorkflowEdgeProps) => {
  const isHorizontal = sourcePosition === 'right' || sourcePosition === 'left'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    offset: isHorizontal ? 30 : 20,
  })

  const isSelected = data?.isSelected ?? false

  const lastRunEdges = useLastRunEdges()

  const dataSourceHandle = (data as { sourceHandle?: string } | undefined)?.sourceHandle
  const isErrorEdge = (sourceHandle ?? dataSourceHandle) === 'error'
  const edgeRunStatus = lastRunEdges.get(id)

  const edgeStyle = useMemo(() => {
    let color = 'var(--color-border-strong, #D4D2CE)'
    let opacity = 1

    if (edgeRunStatus === 'success') {
      color = 'var(--color-accent, #2D8653)'
    } else if (edgeRunStatus === 'error') {
      color = '#ef4444'
    } else if (isErrorEdge) {
      color = '#ef4444'
    }

    if (isSelected) {
      opacity = 0.5
    }

    return {
      ...(style ?? {}),
      strokeWidth: edgeRunStatus === 'success' || edgeRunStatus === 'error'
        ? 2.5
        : isSelected
          ? 2.5
          : 2,
      stroke: color,
      opacity,
    }
  }, [style, isSelected, isErrorEdge, edgeRunStatus])

  return (
    <>
      <BaseEdge path={edgePath} style={edgeStyle} interactionWidth={30} />

      {isSelected && (
        <EdgeLabelRenderer>
          <div
            className='nodrag nopan group flex h-[22px] w-[22px] cursor-pointer items-center justify-center transition-colors'
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 100,
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()

              if (data?.onDelete) {
                data.onDelete(id)
              }
            }}
          >
            <X className='h-4 w-4 text-red-500 transition-colors group-hover:text-red-400' weight="bold" />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

/**
 * Workflow edge component with execution status visualization.
 * Copied from Sim's workflow-edge.tsx — UI adapted to our design tokens.
 * Diff visualization removed (not yet implemented).
 */
export const WorkflowEdge = memo(WorkflowEdgeComponent)

'use client'

import { memo, useMemo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Lightning } from '@phosphor-icons/react'
import { getBlock } from '@/lib/sim/blocks'

export interface BlockNodeData {
  type: string
  name: string
  enabled?: boolean
}

export const WorkflowBlockNode = memo(function WorkflowBlockNode({
  data,
  selected,
}: NodeProps<BlockNodeData>) {
  const blockConfig = useMemo(() => getBlock(data.type), [data.type])
  const bgColor = blockConfig?.bgColor ?? '#2D8653'
  const BlockIcon = blockConfig?.icon

  return (
    <div
      className="rounded-xl px-4 py-3 min-w-[180px] transition-shadow"
      style={{
        background: 'var(--color-bg-surface)',
        border: `1.5px solid ${selected ? bgColor : 'var(--color-border)'}`,
        boxShadow: selected
          ? `0 0 0 3px ${bgColor}22`
          : '0 1px 3px rgba(0,0,0,0.07)',
        opacity: data.enabled === false ? 0.5 : 1,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          background: bgColor,
          border: '2px solid white',
          left: -5,
        }}
      />

      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${bgColor}18` }}
        >
          {BlockIcon ? (
            <BlockIcon width={14} height={14} style={{ color: bgColor }} />
          ) : (
            <Lightning size={14} weight="fill" style={{ color: bgColor }} />
          )}
        </div>
        <div className="min-w-0">
          <p
            className="text-xs font-semibold truncate leading-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {data.name}
          </p>
          <p
            className="text-[10px] truncate leading-tight mt-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {blockConfig?.name ?? data.type}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          background: bgColor,
          border: '2px solid white',
          right: -5,
        }}
      />
    </div>
  )
})

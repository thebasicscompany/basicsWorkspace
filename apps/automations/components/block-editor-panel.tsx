'use client'

import { X } from '@phosphor-icons/react'
import type { BlockConfig } from '@/lib/sim/blocks'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import type { BlockState } from '@/apps/automations/stores/workflows/utils'
import { SubBlockField } from './sub-blocks/sub-block-field'

export function BlockEditorPanel({
  workflowId,
  block,
  config,
  onClose,
}: {
  workflowId: string
  block: BlockState
  config: BlockConfig<any>
  onClose: () => void
}) {
  const Icon = config.icon
  const basicSubBlocks = (config.subBlocks ?? []).filter(
    (sb: SubBlockConfig) => !sb.mode || sb.mode === 'basic' || sb.mode === 'both'
  )

  return (
    <div
      className="w-80 flex-shrink-0 overflow-y-auto"
      style={{
        background: 'var(--color-bg-surface)',
        borderLeft: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${config.bgColor}18` }}
        >
          {Icon && <Icon width={16} height={16} style={{ color: config.bgColor }} />}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {block.name}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {config.name}
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100">
          <X size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        </button>
      </div>

      {config.description && (
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {config.description}
          </p>
        </div>
      )}

      {/* Sub-block fields */}
      {basicSubBlocks.length > 0 && (
        <div className="px-4 py-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Configuration
          </p>
          <div className="space-y-3">
            {basicSubBlocks.map((sb: SubBlockConfig) => (
              <SubBlockField
                key={sb.id}
                blockId={block.id}
                config={sb}
/>
            ))}
          </div>
        </div>
      )}

      {/* Outputs */}
      {config.outputs && Object.keys(config.outputs).length > 0 && (
        <div
          className="px-4 py-3"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Outputs
          </p>
          <div className="space-y-1">
            {Object.entries(config.outputs).map(([key, def]) => {
              const typeName =
                typeof def === 'string' ? def : (def as any)?.type ?? 'any'
              return (
                <div key={key} className="flex items-center justify-between">
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {key}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: 'var(--color-bg-base)',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {typeName}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

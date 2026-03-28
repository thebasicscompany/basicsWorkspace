'use client'

import { useCallback, useMemo } from 'react'
import { BookOpen, X } from '@phosphor-icons/react'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import { useSubBlockValue } from './hooks/use-sub-block-value'

/**
 * Knowledge Base Selector — functional stub preserving Sim's component interface.
 *
 * In Sim, this component lists workspace knowledge bases via useKnowledgeBasesList,
 * fetches individual KB details via react-query, and supports single + multi-select
 * with tag chips. Our version is a placeholder that will be wired when the RAG /
 * knowledge base infrastructure is built.
 *
 * Sim source (200 lines):
 *   sim/apps/sim/.../sub-block/components/knowledge-base-selector/knowledge-base-selector.tsx
 */

interface KnowledgeBaseSelectorProps {
  blockId: string
  subBlock?: SubBlockConfig
  config?: SubBlockConfig
  disabled?: boolean
  onKnowledgeBaseSelect?: (knowledgeBaseId: string | string[]) => void
  isPreview?: boolean
  previewValue?: string | null
  [key: string]: unknown
}

export function KnowledgeBaseSelector({
  blockId,
  subBlock: subBlockProp,
  config,
  disabled = false,
  onKnowledgeBaseSelect,
  isPreview = false,
  previewValue,
}: KnowledgeBaseSelectorProps) {
  const subBlock = (subBlockProp || config)!
  const [storeValue, setStoreValue] = useSubBlockValue(blockId, subBlock.id)

  const value = isPreview ? previewValue : storeValue
  const isMultiSelect = subBlock.multiSelect === true

  /**
   * Parse value into array of selected IDs.
   * Matches Sim's comma-separated storage format.
   */
  const selectedIds = useMemo(() => {
    if (!value) return []
    if (typeof value === 'string') {
      return value.includes(',')
        ? value
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id.length > 0)
        : [value]
    }
    return []
  }, [value])

  /**
   * Handle single selection — matches Sim's handleChange signature.
   */
  const handleChange = useCallback(
    (selectedValue: string) => {
      if (isPreview) return
      setStoreValue(selectedValue)
      onKnowledgeBaseSelect?.(selectedValue)
    },
    [isPreview, setStoreValue, onKnowledgeBaseSelect]
  )

  /**
   * Handle multi-select changes — matches Sim's handleMultiSelectChange signature.
   */
  const handleMultiSelectChange = useCallback(
    (values: string[]) => {
      if (isPreview) return
      const valueToStore = values.length === 1 ? values[0] : values.join(',')
      setStoreValue(valueToStore)
      onKnowledgeBaseSelect?.(values)
    },
    [isPreview, setStoreValue, onKnowledgeBaseSelect]
  )

  /**
   * Remove a knowledge base from multi-select.
   * Matches Sim's handleRemoveKnowledgeBase signature.
   */
  const handleRemoveKnowledgeBase = useCallback(
    (knowledgeBaseId: string) => {
      if (isPreview) return
      const newSelectedIds = selectedIds.filter((id) => id !== knowledgeBaseId)
      const valueToStore =
        newSelectedIds.length === 1 ? newSelectedIds[0] : newSelectedIds.join(',')
      setStoreValue(valueToStore)
      onKnowledgeBaseSelect?.(newSelectedIds)
    },
    [isPreview, selectedIds, setStoreValue, onKnowledgeBaseSelect]
  )

  const label =
    subBlock.placeholder || (isMultiSelect ? 'Select knowledge bases' : 'Select knowledge base')

  return (
    <div className="w-full">
      {/* Selected knowledge bases display (multi-select tags) */}
      {isMultiSelect && selectedIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selectedIds.map((id) => (
            <div
              key={id}
              className="inline-flex items-center rounded-md px-2 py-1 text-xs"
              style={{
                border: '1px solid var(--color-accent)',
                borderColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
                background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              }}
            >
              <BookOpen
                size={12}
                className="mr-1"
                style={{ color: 'var(--color-accent)' }}
              />
              <span
                className="font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                {id}
              </span>
              {!disabled && !isPreview && (
                <button
                  type="button"
                  onClick={() => handleRemoveKnowledgeBase(id)}
                  className="ml-1 hover:opacity-100 transition-opacity"
                  style={{
                    color: 'var(--color-accent)',
                    opacity: 0.6,
                  }}
                  aria-label={`Remove ${id}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Placeholder — no knowledge bases available yet */}
      <div
        className="flex items-center gap-2 rounded-lg px-2.5 py-2"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-base)',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <BookOpen
          size={14}
          style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
        />
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : 'No knowledge bases available'}
        </span>
      </div>
    </div>
  )
}

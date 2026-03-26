'use client'

import { useCallback, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import type { SubBlockInputProps } from './shared'
import { baseInputClass, baseStyle } from './shared'

/**
 * Knowledge Base Selector — placeholder for knowledge base integration.
 */
export function KnowledgeBaseSelector({ value, onChange }: SubBlockInputProps) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter knowledge base ID\u2026"
      className={baseInputClass}
      style={baseStyle}
    />
  )
}

/**
 * Knowledge Tag Filters — multi-tag picker for filtering knowledge bases.
 */
export function KnowledgeTagFilters({ value, onChange }: SubBlockInputProps) {
  const tags: string[] = Array.isArray(value) ? value : []

  const [input, setInput] = useState('')

  const addTag = useCallback(() => {
    const tag = input.trim()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setInput('')
  }, [input, tags, onChange])

  const removeTag = useCallback(
    (idx: number) => {
      onChange(tags.filter((_, i) => i !== idx))
    },
    [tags, onChange]
  )

  return (
    <div className="space-y-1.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--color-accent-light)',
                color: 'var(--color-accent)',
              }}
            >
              {tag}
              <button onClick={() => removeTag(idx)} className="hover:opacity-70">
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder="Add tag\u2026"
          className={`${baseInputClass} flex-1`}
          style={baseStyle}
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors"
        >
          <Plus size={10} style={{ color: 'var(--color-text-tertiary)' }} />
        </button>
      </div>
    </div>
  )
}

/**
 * Document Tag Entry — free-form tag creation.
 */
export function DocumentTagEntry({ value, onChange }: SubBlockInputProps) {
  return <KnowledgeTagFilters value={value} onChange={onChange} config={{} as any} blockId="" />
}

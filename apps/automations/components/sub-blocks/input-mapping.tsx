'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import type { SubBlockInputProps } from './shared'
import { baseInputClass, baseStyle } from './shared'

interface MappingEntry {
  id: string
  sourceKey: string
  targetKey: string
}

export function InputMapping({ value, onChange }: SubBlockInputProps) {
  const [mappings, setMappings] = useState<MappingEntry[]>(() =>
    parseMappings(value)
  )

  useEffect(() => {
    setMappings(parseMappings(value))
  }, [value])

  const persist = useCallback(
    (m: MappingEntry[]) => {
      setMappings(m)
      onChange(m)
    },
    [onChange]
  )

  const updateMapping = useCallback(
    (idx: number, updates: Partial<MappingEntry>) => {
      const next = mappings.map((m, i) =>
        i === idx ? { ...m, ...updates } : m
      )
      persist(next)
    },
    [mappings, persist]
  )

  const addMapping = useCallback(() => {
    persist([
      ...mappings,
      { id: crypto.randomUUID(), sourceKey: '', targetKey: '' },
    ])
  }, [mappings, persist])

  const removeMapping = useCallback(
    (idx: number) => {
      persist(mappings.filter((_, i) => i !== idx))
    },
    [mappings, persist]
  )

  return (
    <div className="space-y-1.5">
      {mappings.map((m, idx) => (
        <div key={m.id} className="flex items-center gap-1.5">
          <input
            type="text"
            value={m.sourceKey}
            onChange={(e) =>
              updateMapping(idx, { sourceKey: e.target.value })
            }
            placeholder="Source"
            className={`${baseInputClass} flex-1`}
            style={baseStyle}
          />
          <span
            className="text-[10px]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            \u2192
          </span>
          <input
            type="text"
            value={m.targetKey}
            onChange={(e) =>
              updateMapping(idx, { targetKey: e.target.value })
            }
            placeholder="Target"
            className={`${baseInputClass} flex-1`}
            style={baseStyle}
          />
          <button
            onClick={() => removeMapping(idx)}
            className="p-1 rounded hover:bg-zinc-100 transition-colors flex-shrink-0"
          >
            <Trash
              size={10}
              style={{ color: 'var(--color-text-tertiary)' }}
            />
          </button>
        </div>
      ))}

      <button
        onClick={addMapping}
        className="flex items-center gap-1.5 text-[10px] font-medium transition-colors hover:opacity-70"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <Plus size={10} />
        Add mapping
      </button>
    </div>
  )
}

function parseMappings(value: any): MappingEntry[] {
  if (Array.isArray(value)) return value
  return []
}

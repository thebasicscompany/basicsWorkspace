'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SubBlockInputProps } from './shared'
import { baseInputClass, baseStyle } from './shared'

interface SortRule {
  id: string
  column: string
  direction: 'asc' | 'desc'
}

export function SortBuilder({ value, onChange }: SubBlockInputProps) {
  const [rules, setRules] = useState<SortRule[]>(() => parseRules(value))

  useEffect(() => {
    setRules(parseRules(value))
  }, [value])

  const persist = useCallback(
    (r: SortRule[]) => {
      setRules(r)
      onChange(r)
    },
    [onChange]
  )

  const updateRule = useCallback(
    (idx: number, updates: Partial<SortRule>) => {
      const next = rules.map((r, i) => (i === idx ? { ...r, ...updates } : r))
      persist(next)
    },
    [rules, persist]
  )

  const addRule = useCallback(() => {
    persist([...rules, { id: crypto.randomUUID(), column: '', direction: 'asc' }])
  }, [rules, persist])

  const removeRule = useCallback(
    (idx: number) => {
      if (rules.length <= 1) {
        persist([{ id: crypto.randomUUID(), column: '', direction: 'asc' }])
        return
      }
      persist(rules.filter((_, i) => i !== idx))
    },
    [rules, persist]
  )

  return (
    <div className="space-y-1.5">
      {rules.map((rule, idx) => (
        <div key={rule.id} className="flex items-center gap-1.5">
          <input
            type="text"
            value={rule.column}
            onChange={(e) => updateRule(idx, { column: e.target.value })}
            placeholder="Column"
            className={`${baseInputClass} flex-1`}
            style={baseStyle}
          />
          <Select
            value={rule.direction}
            onValueChange={(val) =>
              updateRule(idx, { direction: val as 'asc' | 'desc' })
            }
          >
            <SelectTrigger size="sm" className="w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => removeRule(idx)}
            className="p-1 rounded hover:bg-zinc-100 transition-colors flex-shrink-0"
          >
            <Trash size={10} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>
      ))}

      <button
        onClick={addRule}
        className="flex items-center gap-1.5 text-[10px] font-medium transition-colors hover:opacity-70"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <Plus size={10} />
        Add sort rule
      </button>
    </div>
  )
}

function parseRules(value: any): SortRule[] {
  if (Array.isArray(value) && value.length > 0) return value
  return [{ id: crypto.randomUUID(), column: '', direction: 'asc' }]
}

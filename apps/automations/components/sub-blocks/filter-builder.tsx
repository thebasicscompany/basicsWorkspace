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

interface FilterRule {
  id: string
  logicalOperator: 'and' | 'or'
  column: string
  operator: string
  value: string
}

const OPERATORS = [
  { id: 'eq', label: 'equals' },
  { id: 'neq', label: 'not equals' },
  { id: 'gt', label: 'greater than' },
  { id: 'lt', label: 'less than' },
  { id: 'gte', label: '\u2265' },
  { id: 'lte', label: '\u2264' },
  { id: 'like', label: 'contains' },
  { id: 'not_like', label: 'not contains' },
  { id: 'is_null', label: 'is empty' },
  { id: 'is_not_null', label: 'is not empty' },
]

export function FilterBuilder({ value, onChange }: SubBlockInputProps) {
  const [rules, setRules] = useState<FilterRule[]>(() => parseRules(value))

  useEffect(() => {
    setRules(parseRules(value))
  }, [value])

  const persist = useCallback(
    (r: FilterRule[]) => {
      setRules(r)
      onChange(r)
    },
    [onChange]
  )

  const updateRule = useCallback(
    (idx: number, updates: Partial<FilterRule>) => {
      const next = rules.map((r, i) => (i === idx ? { ...r, ...updates } : r))
      persist(next)
    },
    [rules, persist]
  )

  const addRule = useCallback(() => {
    persist([
      ...rules,
      {
        id: crypto.randomUUID(),
        logicalOperator: 'and',
        column: '',
        operator: 'eq',
        value: '',
      },
    ])
  }, [rules, persist])

  const removeRule = useCallback(
    (idx: number) => {
      if (rules.length <= 1) {
        persist([defaultRule()])
        return
      }
      persist(rules.filter((_, i) => i !== idx))
    },
    [rules, persist]
  )

  return (
    <div className="space-y-1.5">
      {rules.map((rule, idx) => (
        <div key={rule.id} className="space-y-1">
          {idx > 0 && (
            <Select
              value={rule.logicalOperator}
              onValueChange={(val) =>
                updateRule(idx, { logicalOperator: val as 'and' | 'or' })
              }
            >
              <SelectTrigger
                size="sm"
                className="h-5 w-14 border-0 bg-transparent px-0 text-[10px] font-medium uppercase shadow-none focus-visible:ring-0"
                style={{ color: 'var(--color-accent)' }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">AND</SelectItem>
                <SelectItem value="or">OR</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={rule.column}
              onChange={(e) => updateRule(idx, { column: e.target.value })}
              placeholder="Column"
              className={`${baseInputClass} flex-1`}
              style={baseStyle}
            />
            <Select
              value={rule.operator}
              onValueChange={(val) => updateRule(idx, { operator: val ?? 'eq' })}
            >
              <SelectTrigger size="sm" className="w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="text"
              value={rule.value}
              onChange={(e) => updateRule(idx, { value: e.target.value })}
              placeholder="Value"
              className={`${baseInputClass} flex-1`}
              style={baseStyle}
            />
            <button
              onClick={() => removeRule(idx)}
              className="p-1 rounded hover:bg-zinc-100 transition-colors flex-shrink-0"
            >
              <Trash size={10} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addRule}
        className="flex items-center gap-1.5 text-[10px] font-medium transition-colors hover:opacity-70"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <Plus size={10} />
        Add filter
      </button>
    </div>
  )
}

function defaultRule(): FilterRule {
  return {
    id: crypto.randomUUID(),
    logicalOperator: 'and',
    column: '',
    operator: 'eq',
    value: '',
  }
}

function parseRules(value: any): FilterRule[] {
  if (Array.isArray(value) && value.length > 0) return value
  return [defaultRule()]
}

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

interface FormatField {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
}

const FIELD_TYPES: FormatField['type'][] = ['string', 'number', 'boolean', 'object', 'array']

export function InputFormatInput({ value, onChange }: SubBlockInputProps) {
  const [fields, setFields] = useState<FormatField[]>(() => parseFields(value))

  useEffect(() => {
    setFields(parseFields(value))
  }, [value])

  const persist = useCallback(
    (f: FormatField[]) => {
      setFields(f)
      onChange(f)
    },
    [onChange]
  )

  const updateField = useCallback(
    (idx: number, updates: Partial<FormatField>) => {
      const next = fields.map((f, i) => (i === idx ? { ...f, ...updates } : f))
      persist(next)
    },
    [fields, persist]
  )

  const addField = useCallback(() => {
    persist([...fields, { id: crypto.randomUUID(), name: '', type: 'string' }])
  }, [fields, persist])

  const removeField = useCallback(
    (idx: number) => {
      if (fields.length <= 1) return
      persist(fields.filter((_, i) => i !== idx))
    },
    [fields, persist]
  )

  return (
    <div className="space-y-1.5">
      {fields.map((field, idx) => (
        <div key={field.id} className="flex items-center gap-1.5">
          <input
            type="text"
            value={field.name}
            onChange={(e) => updateField(idx, { name: e.target.value })}
            placeholder="Field name"
            className={`${baseInputClass} flex-1`}
            style={baseStyle}
          />
          <Select
            value={field.type}
            onValueChange={(val) =>
              updateField(idx, { type: val as FormatField['type'] })
            }
          >
            <SelectTrigger size="sm" className="w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => removeField(idx)}
            disabled={fields.length <= 1}
            className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors flex-shrink-0"
          >
            <Trash size={10} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>
      ))}

      <button
        onClick={addField}
        className="flex items-center gap-1.5 text-[10px] font-medium transition-colors hover:opacity-70"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <Plus size={10} />
        Add field
      </button>
    </div>
  )
}

function parseFields(value: any): FormatField[] {
  if (Array.isArray(value) && value.length > 0) return value
  return [{ id: crypto.randomUUID(), name: '', type: 'string' }]
}

// Response format uses the same component
export function ResponseFormatInput(props: SubBlockInputProps) {
  return <InputFormatInput {...props} />
}

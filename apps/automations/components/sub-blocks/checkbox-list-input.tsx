'use client'

import { useMemo } from 'react'
import type { SubBlockInputProps } from './shared'

export function CheckboxListInput({ config, value, onChange }: SubBlockInputProps) {
  const options = useMemo(() => {
    if (Array.isArray(config.options)) return config.options
    if (typeof config.options === 'function') return config.options()
    return []
  }, [config.options])

  const selected: string[] = Array.isArray(value) ? value : value ? String(value).split(',') : []

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id]
    onChange(next)
  }

  return (
    <div className="space-y-1">
      {options.map((o: any) => {
        const id = o.id ?? o
        const label = o.label ?? o
        return (
          <label key={id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(id)}
              onChange={() => toggle(id)}
              className="rounded border-zinc-300"
            />
            <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
              {label}
            </span>
          </label>
        )
      })}
    </div>
  )
}

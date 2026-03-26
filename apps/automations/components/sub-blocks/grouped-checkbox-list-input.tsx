'use client'

import { useMemo } from 'react'
import type { SubBlockInputProps } from './shared'

interface GroupedOption {
  group: string
  items: { id: string; label: string }[]
}

export function GroupedCheckboxListInput({ config, value, onChange }: SubBlockInputProps) {
  const groups: GroupedOption[] = useMemo(() => {
    if (!Array.isArray(config.options)) return []
    // Options can be flat or grouped
    const opts = config.options as any[]
    if (opts.length === 0) return []
    if (opts[0]?.group) return opts as GroupedOption[]
    // Flat options → single group
    return [{ group: '', items: opts.map((o) => ({ id: o.id ?? o, label: o.label ?? o })) }]
  }, [config.options])

  const selected: string[] = Array.isArray(value) ? value : value ? String(value).split(',') : []

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id]
    onChange(next)
  }

  function toggleGroup(items: { id: string }[]) {
    const ids = items.map((i) => i.id)
    const allSelected = ids.every((id) => selected.includes(id))
    if (allSelected) {
      onChange(selected.filter((s) => !ids.includes(s)))
    } else {
      const merged = new Set([...selected, ...ids])
      onChange(Array.from(merged))
    }
  }

  return (
    <div
      className="space-y-2 max-h-48 overflow-y-auto pr-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      {groups.map((g) => {
        const allSelected = g.items.every((i) => selected.includes(i.id))
        return (
          <div key={g.group}>
            {g.group && (
              <div className="flex items-center gap-2 mb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => toggleGroup(g.items)}
                    className="rounded border-zinc-300"
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {g.group}
                  </span>
                </label>
              </div>
            )}
            <div className="space-y-0.5 pl-1">
              {g.items.map((item) => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => toggle(item.id)}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import type { SubBlockInputProps } from './shared'

export function SwitchInput({ value, onChange }: SubBlockInputProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-zinc-300"
      />
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {value ? 'Enabled' : 'Disabled'}
      </span>
    </label>
  )
}

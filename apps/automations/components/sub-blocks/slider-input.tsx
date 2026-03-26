'use client'

import type { SubBlockInputProps } from './shared'

export function SliderInput({ config, value, onChange }: SubBlockInputProps) {
  const min = config.min ?? 0
  const max = config.max ?? 1
  const step = config.step ?? 0.1
  const current = value ?? config.defaultValue ?? 0.5

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          onChange(config.integer ? Math.round(v) : v)
        }}
        className="flex-1"
      />
      <span className="text-xs w-8 text-right" style={{ color: 'var(--color-text-tertiary)' }}>
        {typeof current === 'number' ? (config.integer ? current : current.toFixed(1)) : '\u2014'}
      </span>
    </div>
  )
}

'use client'

import type { SubBlockInputProps } from './shared'
import { baseInputClass, baseStyle } from './shared'

export function TimeInput({ value, onChange }: SubBlockInputProps) {
  return (
    <input
      type="time"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={baseInputClass}
      style={baseStyle}
    />
  )
}

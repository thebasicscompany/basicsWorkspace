'use client'

import type { SubBlockInputProps } from './shared'

export function TextDisplay({ config, value }: SubBlockInputProps) {
  return (
    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
      {value ?? config.defaultValue ?? config.placeholder ?? ''}
    </p>
  )
}

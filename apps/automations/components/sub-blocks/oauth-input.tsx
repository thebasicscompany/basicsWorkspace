'use client'

import { Lock } from '@phosphor-icons/react'
import type { SubBlockInputProps } from './shared'
import { baseInputClass, baseStyle } from './shared'

/**
 * OAuth credential selector.
 * Currently renders as a placeholder. Will show stored credentials
 * once the OAuth infrastructure is wired.
 */
export function OAuthInput({ value, onChange }: SubBlockInputProps) {
  return (
    <div
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-base)' }}
    >
      <Lock size={12} style={{ color: 'var(--color-text-tertiary)' }} />
      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        {value ? `Credential: ${value}` : 'Connect account to authenticate'}
      </span>
    </div>
  )
}

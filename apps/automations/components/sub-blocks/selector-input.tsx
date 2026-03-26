'use client'

import type { SubBlockInputProps } from './shared'
import { baseInputClass, baseStyle } from './shared'

/**
 * Generic selector for resource types that need external API integration:
 * file-selector, sheet-selector, project-selector, folder-selector,
 * channel-selector, user-selector, document-selector, table-selector
 *
 * Currently renders as a text input for entering resource IDs.
 * Will be upgraded to a searchable dropdown once OAuth/API integrations are wired.
 */
export function SelectorInput({ config, value, onChange }: SubBlockInputProps) {
  const typeLabel = config.type.replace(/-/g, ' ').replace('selector', '').trim()

  return (
    <div>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config.placeholder ?? `Enter ${typeLabel} ID\u2026`}
        className={baseInputClass}
        style={baseStyle}
      />
      <p
        className="text-[9px] mt-1"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} selector \u2014 connect an account to browse
      </p>
    </div>
  )
}

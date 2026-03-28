'use client'

import { useCallback, useMemo, useState } from 'react'
import { LinkSimple, UserCircle } from '@phosphor-icons/react'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import { useDependsOnGate } from './hooks/use-depends-on-gate'
import { useSubBlockValue } from './hooks/use-sub-block-value'

/**
 * Credential Selector — functional stub preserving Sim's component interface.
 *
 * In Sim, this component manages OAuth credentials via workspace APIs,
 * credential sets, polling groups, and an OAuth-required modal. Our version
 * is a placeholder that will be wired to the gateway OAuth flow later.
 *
 * Sim source (419 lines):
 *   sim/apps/sim/.../sub-block/components/credential-selector/credential-selector.tsx
 */

interface CredentialSelectorProps {
  blockId: string
  subBlock?: SubBlockConfig
  config?: SubBlockConfig
  disabled?: boolean
  isPreview?: boolean
  previewValue?: any | null
  previewContextValues?: Record<string, unknown>
  [key: string]: unknown
}

export function CredentialSelector({
  blockId,
  subBlock: subBlockProp,
  config,
  disabled = false,
  isPreview = false,
  previewValue,
  previewContextValues,
}: CredentialSelectorProps) {
  const subBlock = (subBlockProp || config)!
  const [storeValue, setStoreValue] = useSubBlockValue<string | null>(blockId, subBlock.id)

  const requiredScopes = subBlock.requiredScopes || []
  const label = subBlock.placeholder || 'Select credential'
  const serviceId = subBlock.serviceId || ''

  const { depsSatisfied, dependsOn } = useDependsOnGate(blockId, subBlock, {
    disabled,
    isPreview,
    previewContextValues,
  })
  const hasDependencies = dependsOn.length > 0
  const effectiveDisabled = disabled || (hasDependencies && !depsSatisfied)

  const effectiveValue = isPreview && previewValue !== undefined ? previewValue : storeValue
  const selectedId = typeof effectiveValue === 'string' ? effectiveValue : ''

  const handleConnect = useCallback(() => {
    // TODO: Wire to gateway OAuth flow
    // In Sim this navigates to settings/integrations with a pending credential request
    console.warn('[CredentialSelector] OAuth flow not yet wired — will route through gateway')
  }, [])

  const handleClear = useCallback(() => {
    if (isPreview) return
    setStoreValue(null)
  }, [isPreview, setStoreValue])

  const placeholderText = hasDependencies && !depsSatisfied
    ? 'Fill in required fields above first'
    : label

  return (
    <div>
      {selectedId ? (
        /* Show selected credential */
        <div
          className="flex items-center justify-between rounded-lg px-2.5 py-2"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <UserCircle
              size={14}
              weight="fill"
              style={{ color: 'var(--color-accent)', flexShrink: 0 }}
            />
            <span
              className="text-xs truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {selectedId}
            </span>
          </div>
          {!effectiveDisabled && !isPreview && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 text-xs hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Disconnect
            </button>
          )}
        </div>
      ) : (
        /* Show connect button */
        <button
          type="button"
          onClick={handleConnect}
          disabled={effectiveDisabled}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-base)',
          }}
        >
          <LinkSimple
            size={14}
            style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
          />
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {placeholderText}
          </span>
        </button>
      )}
    </div>
  )
}

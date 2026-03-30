'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CaretDown, Check, LinkSimple, SignOut, UserCircle } from '@phosphor-icons/react'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import { useDependsOnGate } from './hooks/use-depends-on-gate'
import { useSubBlockValue } from './hooks/use-sub-block-value'

/**
 * Credential Selector — wired to gateway connections API.
 *
 * Fetches connected OAuth providers from /api/connections, filters by the
 * block's serviceId, and lets the user pick an existing connection or start
 * a new OAuth flow via the gateway.
 */

interface Connection {
  provider: string
  accountName?: string | null
  accountEmail?: string | null
  id?: string
}

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

// Cache connections across all credential-selector instances to avoid redundant fetches
let cachedConnections: Connection[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30_000 // 30s

async function fetchConnections(): Promise<Connection[]> {
  const now = Date.now()
  if (cachedConnections && now - cacheTimestamp < CACHE_TTL) {
    return cachedConnections
  }
  try {
    const res = await fetch('/api/connections')
    if (!res.ok) return cachedConnections || []
    const data = await res.json()
    cachedConnections = Array.isArray(data) ? data : []
    cacheTimestamp = now
    return cachedConnections
  } catch {
    return cachedConnections || []
  }
}

/** Invalidate cache (called after connect/disconnect) */
function invalidateConnectionCache() {
  cachedConnections = null
  cacheTimestamp = 0
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

  const serviceId = subBlock.serviceId || ''
  const label = subBlock.placeholder || subBlock.title || 'Select account'

  const { depsSatisfied, dependsOn } = useDependsOnGate(blockId, subBlock, {
    disabled,
    isPreview,
    previewContextValues,
  })
  const hasDependencies = dependsOn.length > 0
  const effectiveDisabled = disabled || (hasDependencies && !depsSatisfied)

  const effectiveValue = isPreview && previewValue !== undefined ? previewValue : storeValue
  const selectedId = typeof effectiveValue === 'string' ? effectiveValue : ''

  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch connections on mount and when tab regains focus (OAuth flow returns)
  const loadConnections = useCallback(async () => {
    setLoading(true)
    const conns = await fetchConnections()
    setConnections(conns)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadConnections()

    // Re-fetch when tab becomes visible (user returning from OAuth redirect)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        invalidateConnectionCache()
        loadConnections()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loadConnections])

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Filter connections for this provider
  const matchingConnections = useMemo(
    () => connections.filter((c) => c.provider === serviceId),
    [connections, serviceId]
  )

  const selectedConnection = useMemo(
    () => matchingConnections.find((c) => (c.id || c.provider) === selectedId),
    [matchingConnections, selectedId]
  )

  // If there's exactly one matching connection and no selection, auto-select it
  useEffect(() => {
    if (!isPreview && !selectedId && matchingConnections.length === 1 && !loading) {
      const conn = matchingConnections[0]
      setStoreValue(conn.id || conn.provider)
    }
  }, [matchingConnections, selectedId, isPreview, loading, setStoreValue])

  const handleSelect = useCallback(
    (conn: Connection) => {
      if (isPreview) return
      setStoreValue(conn.id || conn.provider)
      setIsOpen(false)
    },
    [isPreview, setStoreValue]
  )

  const handleDisconnect = useCallback(() => {
    if (isPreview) return
    setStoreValue(null)
  }, [isPreview, setStoreValue])

  const handleConnect = useCallback(async () => {
    if (!serviceId || connecting) return
    setConnecting(true)
    try {
      // Build redirect URL back to the current canvas page
      const redirectAfter = window.location.href
      const res = await fetch(
        `/api/connections/${serviceId}/authorize?redirect_after=${encodeURIComponent(redirectAfter)}`
      )
      if (!res.ok) {
        console.error('[CredentialSelector] Failed to get authorize URL')
        return
      }
      const { url } = await res.json()
      if (url) {
        invalidateConnectionCache()
        window.location.href = url
      }
    } catch (err) {
      console.error('[CredentialSelector] OAuth error:', err)
    } finally {
      setConnecting(false)
    }
  }, [serviceId, connecting])

  const placeholderText = hasDependencies && !depsSatisfied
    ? 'Fill in required fields above first'
    : label

  const displayName = selectedConnection
    ? selectedConnection.accountName || selectedConnection.accountEmail || selectedConnection.provider
    : selectedId || ''

  // ─── Selected state ────────────────────────────────────────────────────────
  if (selectedId) {
    return (
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
            {displayName}
          </span>
        </div>
        {!effectiveDisabled && !isPreview && (
          <button
            type="button"
            onClick={handleDisconnect}
            className="ml-2 flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <SignOut size={12} />
            Disconnect
          </button>
        )}
      </div>
    )
  }

  // ─── Empty state — dropdown or connect ──────────────────────────────────────
  return (
    <div ref={dropdownRef} className="relative">
      {/* Main trigger button */}
      <button
        type="button"
        onClick={() => {
          if (effectiveDisabled) return
          if (matchingConnections.length > 0) {
            setIsOpen((prev) => !prev)
          } else {
            handleConnect()
          }
        }}
        disabled={effectiveDisabled || connecting}
        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-base)',
        }}
      >
        <div className="flex items-center gap-2">
          <LinkSimple
            size={14}
            style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {connecting ? 'Redirecting...' : loading ? 'Loading...' : placeholderText}
          </span>
        </div>
        {matchingConnections.length > 0 && (
          <CaretDown size={12} style={{ color: 'var(--color-text-tertiary)' }} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && matchingConnections.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border shadow-md overflow-hidden"
          style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {matchingConnections.map((conn) => {
            const connId = conn.id || conn.provider
            const connLabel = conn.accountName || conn.accountEmail || conn.provider
            const isSelected = connId === selectedId
            return (
              <button
                key={connId}
                type="button"
                onClick={() => handleSelect(conn)}
                className="flex w-full items-center justify-between px-2.5 py-2 text-xs hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserCircle size={14} weight="fill" style={{ color: 'var(--color-accent)' }} />
                  <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {connLabel}
                  </span>
                </div>
                {isSelected && <Check size={14} style={{ color: 'var(--color-accent)' }} />}
              </button>
            )
          })}

          {/* Connect another account option */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              handleConnect()
            }}
            className="flex w-full items-center gap-2 px-2.5 py-2 text-xs hover:bg-black/5 transition-colors"
            style={{
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <LinkSimple size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Connect another account
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

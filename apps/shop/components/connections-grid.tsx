'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConnectionTile } from '@/components/launchpad/connection-tile'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PROVIDERS } from '@/apps/shop/providers'

const CATEGORIES = [
  { id: 'all',           label: 'All' },
  { id: 'communication', label: 'Communication' },
  { id: 'productivity',  label: 'Productivity' },
  { id: 'dev',           label: 'Developer' },
  { id: 'crm',           label: 'CRM' },
  { id: 'storage',       label: 'Storage' },
  { id: 'commerce',      label: 'Commerce' },
]

// ─── Component ──────────────────────────────────────────────────────────────

interface Connection {
  provider: string
  accountName?: string | null
}

export function ConnectionsGrid() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [justConnected, setJustConnected] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    if (connected) {
      setJustConnected(connected)
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => setJustConnected(null), 3000)
    }
  }, [])

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections')
      if (res.ok) {
        const data = await res.json()
        setConnections(Array.isArray(data) ? data : [])
      }
    } catch { /* gateway not running */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchConnections() }, [fetchConnections])

  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null)

  async function handleClick(providerId: string) {
    const isConnected = connectedSet.has(providerId)
    if (isConnected) {
      setConfirmDisconnect(providerId)
    } else {
      try {
        const res = await fetch(`/api/connections/${providerId}/authorize`)
        if (!res.ok) return
        const { url } = await res.json()
        window.location.href = url
      } catch { /* ignore */ }
    }
  }

  async function handleDisconnect() {
    if (!confirmDisconnect) return
    try {
      await fetch(`/api/connections/${confirmDisconnect}`, { method: 'DELETE' })
      setConnections((prev) => prev.filter((c) => c.provider !== confirmDisconnect))
      toast.success('Connection removed')
    } catch {
      toast.error('Failed to disconnect')
    }
    setConfirmDisconnect(null)
  }

  const connectedSet = new Set(connections.map((c) => c.provider))
  const filtered = filter === 'all'
    ? PROVIDERS
    : PROVIDERS.filter((p) => p.category === filter)

  return (
    <div>
      {/* Category filter tabs */}
      <div className="flex items-center gap-1.5 mb-8 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            style={{
              background: filter === cat.id ? 'var(--color-accent)' : 'var(--color-bg-surface)',
              color: filter === cat.id ? 'white' : 'var(--color-text-secondary)',
              border: filter === cat.id ? 'none' : '1px solid var(--color-border)',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Squircle grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <CircleNotch size={24} className="animate-spin" style={{ color: 'var(--color-text-tertiary)' }} />
        </div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {filtered.map((provider) => {
            const Icon = provider.icon
            const isConnected = connectedSet.has(provider.id) || justConnected === provider.id
            return (
              <ConnectionTile
                key={provider.id}
                name={provider.name}
                icon={<Icon className="w-8 h-8" />}
                connected={isConnected}
                onClick={() => handleClick(provider.id)}
              />
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDisconnect}
        onOpenChange={(open) => { if (!open) setConfirmDisconnect(null) }}
        title="Disconnect integration"
        description={`This will remove the connection to ${PROVIDERS.find((p) => p.id === confirmDisconnect)?.name ?? 'this service'}. You can reconnect it later.`}
        confirmLabel="Disconnect"
        onConfirm={handleDisconnect}
      />
    </div>
  )
}

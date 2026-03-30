'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  CheckCircle,
  CircleNotch,
  Clock,
  Lightning,
  Timer,
  WebhooksLogo,
  WarningCircle,
  XCircle,
  Calendar as CalendarIcon,
  ArrowSquareOut,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExecutionLog {
  id: string
  workflowId: string
  workflowName: string | null
  executionId: string
  status: string
  trigger: string | null
  startedAt: string
  endedAt: string | null
  totalDurationMs: number | null
  executionData: unknown[] | null
  cost: Record<string, unknown> | null
}

type StatusFilter = 'all' | 'running' | 'success' | 'error' | 'cancelled'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'success', label: 'Success' },
  { id: 'error', label: 'Error' },
  { id: 'cancelled', label: 'Cancelled' },
]

const PAGE_SIZE = 25

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    running: {
      icon: <CircleNotch size={12} className="animate-spin" />,
      color: 'var(--color-accent)',
      bg: 'var(--color-accent-light)',
      label: 'Running',
    },
    success: {
      icon: <CheckCircle size={12} weight="fill" />,
      color: '#16a34a',
      bg: '#f0fdf4',
      label: 'Success',
    },
    error: {
      icon: <XCircle size={12} weight="fill" />,
      color: '#dc2626',
      bg: '#fef2f2',
      label: 'Error',
    },
    cancelled: {
      icon: <WarningCircle size={12} weight="fill" />,
      color: '#ca8a04',
      bg: '#fefce8',
      label: 'Cancelled',
    },
  }

  const c = config[status] || config.error
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: c.color, background: c.bg }}
    >
      {c.icon}
      {c.label}
    </span>
  )
}

function TriggerBadge({ trigger }: { trigger: string | null }) {
  const icons: Record<string, React.ReactNode> = {
    manual: <Lightning size={11} />,
    scheduled: <Timer size={11} />,
    webhook: <WebhooksLogo size={11} />,
    context_event: <CalendarIcon size={11} />,
  }
  const labels: Record<string, string> = {
    manual: 'Manual',
    scheduled: 'Scheduled',
    webhook: 'Webhook',
    context_event: 'Event',
  }
  const t = trigger || 'manual'
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px]"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {icons[t] || icons.manual}
      {labels[t] || t}
    </span>
  )
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${m}m ${s}s`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  if (isToday) return `Today ${time}`
  if (isYesterday) return `Yesterday ${time}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ` ${time}`
}

// ─── Expanded Row Detail ────────────────────────────────────────────────────

function ExecutionDetail({ log }: { log: ExecutionLog }) {
  const data = log.executionData as any[] | null

  if (!data || data.length === 0) {
    return (
      <div
        className="px-6 py-4 text-xs"
        style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-base)' }}
      >
        No execution data recorded for this run.
      </div>
    )
  }

  return (
    <div className="px-6 py-3 space-y-2" style={{ background: 'var(--color-bg-base)' }}>
      {data.map((entry: any, i: number) => {
        const blockName = entry?.blockName || entry?.blockType || entry?.blockId || `Step ${i + 1}`
        const status = entry?.status || 'unknown'
        const duration = entry?.durationMs ?? entry?.duration
        const error = entry?.error
        const output = entry?.output

        return (
          <div
            key={i}
            className="flex items-start gap-3 rounded-md px-3 py-2 text-xs"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {blockName}
                </span>
                <StatusBadge status={status} />
                {duration != null && (
                  <span style={{ color: 'var(--color-text-tertiary)' }}>
                    {formatDuration(typeof duration === 'number' ? duration : parseInt(duration, 10))}
                  </span>
                )}
              </div>
              {error && (
                <div className="mt-1 text-[11px] leading-relaxed" style={{ color: '#dc2626' }}>
                  {typeof error === 'string' ? error : JSON.stringify(error)}
                </div>
              )}
              {output && !error && (
                <div
                  className="mt-1 text-[11px] leading-relaxed truncate max-w-[600px]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {typeof output === 'string' ? output : JSON.stringify(output).slice(0, 200)}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export function ExecutionLogsDashboard() {
  const router = useRouter()
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/executions?${params}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset page when filter changes
  useEffect(() => {
    setPage(0)
    setExpandedId(null)
  }, [statusFilter])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ─── Stats row ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    // These are counts from the current visible page — good enough for a quick glance
    const running = logs.filter((l) => l.status === 'running').length
    const success = logs.filter((l) => l.status === 'success').length
    const error = logs.filter((l) => l.status === 'error').length
    return { running, success, error, total }
  }, [logs, total])

  return (
    <div
      className="flex-1 p-6"
      style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}
    >
      {/* Stats cards */}
      <div className="flex gap-4 mb-6">
        {[
          { label: 'Total Runs', value: stats.total, color: 'var(--color-text-primary)' },
          { label: 'Running', value: stats.running, color: 'var(--color-accent)' },
          { label: 'Succeeded', value: stats.success, color: '#16a34a' },
          { label: 'Failed', value: stats.error, color: '#dc2626' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex-1 rounded-lg px-4 py-3"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="text-[11px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {stat.label}
            </div>
            <div className="text-lg font-semibold" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: statusFilter === f.id ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                color: statusFilter === f.id ? 'white' : 'var(--color-text-secondary)',
                border: statusFilter === f.id ? 'none' : '1px solid var(--color-border)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { fetchLogs() }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowClockwise size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          background: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="grid items-center px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider"
          style={{
            color: 'var(--color-text-tertiary)',
            borderBottom: '1px solid var(--color-border)',
            gridTemplateColumns: '1fr 100px 90px 90px 140px 40px',
          }}
        >
          <span>Workflow</span>
          <span>Status</span>
          <span>Trigger</span>
          <span>Duration</span>
          <span>Started</span>
          <span />
        </div>

        {/* Rows */}
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <CircleNotch
              size={24}
              className="animate-spin"
              style={{ color: 'var(--color-text-tertiary)' }}
            />
          </div>
        ) : logs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <Clock size={32} className="mb-2 opacity-40" />
            No execution logs yet.
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedId === log.id
            return (
              <div key={log.id}>
                <div
                  className="grid items-center px-4 py-2.5 text-xs cursor-pointer transition-colors hover:bg-black/[.02]"
                  style={{
                    gridTemplateColumns: '1fr 100px 90px 90px 140px 40px',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  {/* Workflow name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="truncate font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {log.workflowName || 'Untitled'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/automations/${log.workflowId}`)
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:opacity-70 transition-opacity shrink-0"
                      title="Open workflow"
                    >
                      <ArrowSquareOut size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                    </button>
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={log.status} />
                  </div>

                  {/* Trigger */}
                  <div>
                    <TriggerBadge trigger={log.trigger} />
                  </div>

                  {/* Duration */}
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    {log.status === 'running' ? (
                      <span className="animate-pulse">Running...</span>
                    ) : (
                      formatDuration(log.totalDurationMs)
                    )}
                  </div>

                  {/* Started */}
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    {formatTime(log.startedAt)}
                  </div>

                  {/* Expand chevron */}
                  <div className="flex justify-end">
                    {isExpanded ? (
                      <CaretUp size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                    ) : (
                      <CaretDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && <ExecutionDetail log={log} />}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-black/5 disabled:opacity-30"
            >
              <CaretLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            <span className="text-xs px-2" style={{ color: 'var(--color-text-secondary)' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-black/5 disabled:opacity-30"
            >
              <CaretRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

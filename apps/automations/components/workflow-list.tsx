'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lightning, Plus, Play, Clock, DotsThree, Trash, PencilSimple, ClockCounterClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'

interface Workflow {
  id: string
  name: string
  description: string | null
  isDeployed: boolean
  runCount: number
  lastRunAt: string | null
  updatedAt: string
}

export function WorkflowList() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    fetch('/api/workflows')
      .then((r) => r.json())
      .then((d) => setWorkflows(d.workflows ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function createWorkflow() {
    setCreating(true)
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Workflow' }),
      })
      const wf = await res.json()
      router.push(`/automations/${wf.id}`)
    } finally {
      setCreating(false)
    }
  }

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-workflow-menu]')) {
        setMenuOpenId(null)
        setConfirmDeleteId(null)
        setRenamingId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

  async function deleteWorkflow(id: string) {
    setDeleting(true)
    try {
      await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
      setWorkflows((prev) => prev.filter((wf) => wf.id !== id))
      toast.success('Workflow deleted')
    } catch {
      toast.error('Failed to delete workflow')
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
      setMenuOpenId(null)
    }
  }

  async function renameWorkflow(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    setWorkflows((prev) => prev.map((wf) => wf.id === id ? { ...wf, name: trimmed } : wf))
    setRenamingId(null)
    setMenuOpenId(null)
  }

  if (loading) {
    return (
      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-[var(--color-bg-surface)] animate-pulse"
            style={{ border: '1px solid var(--color-border)' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8" style={{ background: 'var(--color-bg-base)' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/automations/logs')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
            style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            <ClockCounterClockwise size={14} />
            Logs
          </button>
          <button
            onClick={createWorkflow}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus size={14} weight="bold" />
            New Workflow
          </button>
        </div>
      </div>

      {workflows.length === 0 ? (
        <EmptyState
          icon={<Lightning size={40} className="text-zinc-300" />}
          title="No workflows yet"
          description="Create your first workflow to start automating."
          action={
            <button
              onClick={createWorkflow}
              disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--color-accent)' }}
            >
              <Plus size={14} weight="bold" />
              New Workflow
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="relative text-left rounded-xl p-5 transition-shadow hover:shadow-md bg-[var(--color-bg-surface)] group cursor-pointer"
              style={{ border: '1px solid var(--color-border)' }}
              onClick={() => router.push(`/automations/${wf.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--color-accent-light)' }}
                >
                  <Lightning size={16} style={{ color: 'var(--color-accent)' }} weight="fill" />
                </div>
                <div className="flex items-center gap-1.5">
                  {wf.isDeployed && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                      style={{
                        background: 'var(--color-accent-light)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      Live
                    </span>
                  )}
                  <button
                    data-workflow-menu
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpenId(menuOpenId === wf.id ? null : wf.id)
                      setConfirmDeleteId(null)
                    }}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-bg-sidebar)]"
                  >
                    <DotsThree size={16} weight="bold" style={{ color: 'var(--color-text-tertiary)' }} />
                  </button>
                </div>
              </div>

              {/* Dropdown menu */}
              {menuOpenId === wf.id && (
                <div
                  data-workflow-menu
                  className="absolute right-4 top-14 z-50 min-w-[140px] rounded-lg py-1 shadow-lg"
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {confirmDeleteId === wf.id ? (
                    <div className="px-3 py-2">
                      <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                        Delete this workflow?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteWorkflow(wf.id)}
                          disabled={deleting}
                          className="flex-1 text-xs px-2 py-1 rounded-md text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteId(null); setMenuOpenId(null) }}
                          className="flex-1 text-xs px-2 py-1 rounded-md hover:bg-[var(--color-bg-sidebar)]"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setRenamingId(wf.id)
                          setRenameValue(wf.name)
                          setMenuOpenId(null)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-bg-sidebar)] transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        <PencilSimple size={13} />
                        Rename
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(wf.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-[var(--color-bg-sidebar)] transition-colors"
                      >
                        <Trash size={13} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}

              {renamingId === wf.id ? (
                <input
                  data-workflow-menu
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') renameWorkflow(wf.id, renameValue)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onBlur={() => renameWorkflow(wf.id, renameValue)}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-sm mb-1 w-full rounded-md px-1.5 py-0.5 outline-none"
                  style={{
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg-base)',
                    border: '1px solid var(--color-accent)',
                  }}
                />
              ) : (
                <p className="font-semibold text-sm mb-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {wf.name}
                </p>
              )}
              {wf.description && (
                <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {wf.description}
                </p>
              )}

              <div className="flex items-center gap-3 mt-auto">
                {wf.runCount > 0 && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    <Play size={10} />
                    {wf.runCount.toLocaleString()} runs
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>
                  <Clock size={10} />
                  {new Date(wf.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

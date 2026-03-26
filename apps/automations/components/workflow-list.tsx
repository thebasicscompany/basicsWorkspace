'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lightning, Plus, Play, Clock } from '@phosphor-icons/react'
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
            <button
              key={wf.id}
              onClick={() => router.push(`/automations/${wf.id}`)}
              className="text-left rounded-xl p-5 transition-shadow hover:shadow-md bg-[var(--color-bg-surface)] group"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--color-accent-light)' }}
                >
                  <Lightning size={16} style={{ color: 'var(--color-accent)' }} weight="fill" />
                </div>
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
              </div>

              <p className="font-semibold text-sm mb-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                {wf.name}
              </p>
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
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

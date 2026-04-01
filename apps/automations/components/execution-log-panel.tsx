'use client'

import { useEffect, useRef } from 'react'
import { X, CaretUp, CaretDown, CheckCircle, XCircle, CircleNotch, Lightning } from '@phosphor-icons/react'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface ExecutionEvent {
  type: 'start' | 'block:complete' | 'complete' | 'error' | 'debug'
  executionId?: string
  workflowId?: string
  blockId?: string
  blockName?: string
  blockType?: string
  output?: any
  durationMs?: number
  success?: boolean
  error?: string
  [key: string]: any
}

interface ExecutionLogPanelProps {
  events: ExecutionEvent[]
  isRunning: boolean
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

export function ExecutionLogPanel({
  events,
  isRunning,
  isOpen,
  onToggle,
  onClose,
}: ExecutionLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events.length, isOpen])

  const lastEvent = events[events.length - 1]
  const isComplete = lastEvent?.type === 'complete'
  const hasError = lastEvent?.type === 'error' || (isComplete && !lastEvent?.success)
  const blockEvents = events.filter((e) => e.type === 'block:complete')
  const totalDuration = blockEvents.reduce((sum, e) => sum + (e.durationMs ?? 0), 0)

  if (events.length === 0 && !isRunning) return null

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 flex flex-col"
      style={{
        background: 'var(--color-bg-surface)',
        borderTop: '1px solid var(--color-border)',
        maxHeight: isOpen ? '50%' : undefined,
      }}
    >
      {/* Header bar — always visible */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 text-xs cursor-pointer hover:bg-[var(--color-bg-base)] transition-colors"
        style={{ borderBottom: isOpen ? '1px solid var(--color-border)' : undefined }}
      >
        {isRunning ? (
          <CircleNotch size={14} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        ) : hasError ? (
          <XCircle size={14} weight="fill" style={{ color: 'var(--color-error)' }} />
        ) : isComplete ? (
          <CheckCircle size={14} weight="fill" style={{ color: 'var(--color-accent)' }} />
        ) : (
          <Lightning size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        )}

        <span style={{ color: 'var(--color-text-primary)' }} className="font-medium">
          {isRunning
            ? `Running... (${blockEvents.length} block${blockEvents.length !== 1 ? 's' : ''} complete)`
            : hasError
              ? 'Execution failed'
              : isComplete
                ? `Completed — ${blockEvents.length} block${blockEvents.length !== 1 ? 's' : ''} in ${(totalDuration / 1000).toFixed(1)}s`
                : 'Execution Log'}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {isOpen ? <CaretDown size={12} /> : <CaretUp size={12} />}
          <div
            role="button"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="p-0.5 rounded hover:bg-zinc-200 transition-colors"
          >
            <X size={12} style={{ color: 'var(--color-text-tertiary)' }} />
          </div>
        </div>
      </button>

      {/* Event list — collapsible */}
      {isOpen && (
        <ScrollArea ref={scrollRef} className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(50vh - 40px)' }}>
          <div className="px-4 py-2 space-y-1">
            {events.map((event, i) => (
              <EventRow key={i} event={event} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

function EventRow({ event }: { event: ExecutionEvent }) {
  if (event.type === 'start') {
    return (
      <div className="flex items-center gap-2 py-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        <Lightning size={12} />
        <span>Execution started</span>
        <span className="ml-auto font-mono text-[10px]">{event.executionId?.slice(0, 8)}</span>
      </div>
    )
  }

  if (event.type === 'block:complete') {
    const output = event.output
    const preview = getOutputPreview(output)

    return (
      <div className="py-1.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle size={12} weight="fill" style={{ color: 'var(--color-accent)' }} />
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {event.blockName}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px]"
            style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-tertiary)' }}
          >
            {event.blockType}
          </span>
          <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
            {event.durationMs != null ? `${event.durationMs < 1000 ? `${Math.round(event.durationMs)}ms` : `${(event.durationMs / 1000).toFixed(1)}s`}` : ''}
          </span>
        </div>
        {preview && (
          <pre
            className="mt-1 ml-5 text-[11px] rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono"
            style={{
              background: 'var(--color-bg-base)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {preview}
          </pre>
        )}
      </div>
    )
  }

  if (event.type === 'error') {
    return (
      <div className="py-1.5">
        <div className="flex items-center gap-2 text-xs">
          <XCircle size={12} weight="fill" style={{ color: 'var(--color-error)' }} />
          <span className="font-medium" style={{ color: 'var(--color-error)' }}>Error</span>
        </div>
        <pre
          className="mt-1 ml-5 text-[11px] rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono"
          style={{ background: 'color-mix(in srgb, var(--color-error) 8%, var(--color-bg-surface))', color: 'var(--color-error)' }}
        >
          {event.error}
        </pre>
      </div>
    )
  }

  if (event.type === 'complete') {
    const output = event.output
    const preview = getOutputPreview(output)

    return (
      <div className="py-1.5">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle size={12} weight="fill" style={{ color: 'var(--color-accent)' }} />
          <span className="font-medium" style={{ color: 'var(--color-accent)' }}>
            Workflow complete
          </span>
        </div>
        {preview && (
          <details className="mt-1 ml-5">
            <summary className="text-[10px] cursor-pointer" style={{ color: 'var(--color-text-tertiary)' }}>
              Final output
            </summary>
            <pre
              className="mt-1 text-[11px] rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-mono"
              style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)' }}
            >
              {preview}
            </pre>
          </details>
        )}
      </div>
    )
  }

  return null
}

function getOutputPreview(output: any): string | null {
  if (output == null) return null

  // For agent blocks: show the content
  if (typeof output === 'object' && output.content && typeof output.content === 'string') {
    return output.content
  }

  // For function blocks: show the result
  if (typeof output === 'object' && output.result !== undefined) {
    const result = output.result
    if (typeof result === 'string') return result
    return JSON.stringify(result, null, 2)
  }

  // Generic: stringify
  if (typeof output === 'string') return output
  try {
    return JSON.stringify(output, null, 2)
  } catch {
    return String(output)
  }
}

// Phase 4 stub — execution trace spans (OpenTelemetry)
import type { TraceSpan } from '@/lib/logs/types'

export function startSpan(_name: string, _attrs?: Record<string, unknown>) {
  return { end: () => {} }
}

export function recordSpanError(_span: unknown, _error: unknown) {}

/**
 * Build a structured TraceSpan tree from an execution result.
 * Phase 4 stub — returns empty traceSpans.
 */
export function buildTraceSpans(_result: unknown): { traceSpans: TraceSpan[] } {
  return { traceSpans: [] }
}

/** Filter span keys that should not be shown in output (Phase 4 stub) */
export function filterHiddenOutputKeys(keys: string[]): string[] {
  return keys
}

// Execution log types

/** OpenTelemetry-compatible trace span for workflow execution */
export interface TraceSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  startTime: number
  endTime?: number
  attributes?: Record<string, unknown>
  status?: { code: number; message?: string }
  // Workflow-specific fields
  type?: string
  blockId?: string
  children?: TraceSpan[]
}

export interface ExecutionLog {
  id: string
  workflowId: string
  orgId: string
  executionId: string
  status: 'running' | 'success' | 'error' | 'cancelled'
  trigger: string
  startedAt: string
  endedAt?: string
  durationMs?: number
  blocks: BlockLog[]
}

export interface BlockLog {
  blockId: string
  blockType: string
  status: 'running' | 'success' | 'error' | 'skipped'
  startedAt: string
  endedAt?: string
  durationMs?: number
  input?: unknown
  output?: unknown
  error?: string
}

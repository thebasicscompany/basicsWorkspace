// Workflow type definitions (supplements serializer/types.ts)
export type WorkflowStatus = 'draft' | 'active' | 'archived'
export type BlockStatus = 'idle' | 'running' | 'success' | 'error'

/** Loop iteration type (fixed count vs for-each) */
export type LoopType = 'for' | 'forEach'

/** Parallel execution strategy */
export type ParallelType = 'collection' | 'count'

/** A single field in an input format definition */
export interface InputFormatField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file'
  description?: string
  required?: boolean
  value?: unknown
}

/** Properties that are accessible on UserFile objects in block references */
export const USER_FILE_ACCESSIBLE_PROPERTIES = ['name', 'type', 'size', 'url'] as const

export interface WorkflowRunContext {
  workflowId: string
  orgId: string
  userId?: string
  executionId: string
  trigger: 'manual' | 'scheduled' | 'webhook' | 'context_event'
}

// Phase 4 stub — async job correlation types
export interface AsyncExecutionCorrelation {
  jobId: string
  workflowId: string
  orgId: string
  blockId?: string
}

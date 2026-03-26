// Phase 4 stub — usage logging (gateway handles billing in Phase 3)
export async function logFixedUsage(_opts: {
  orgId?: string
  userId?: string
  toolId?: string
  workflowId?: string
  executionId?: string
  amount?: number
  cost?: number
  source?: string
  description?: string
  metadata?: unknown
}): Promise<void> {}

export async function logUsage(_opts: {
  orgId: string
  workflowId?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  cost?: number
}): Promise<void> {}

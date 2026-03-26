// Phase 3F stub — trigger utility helpers
export function buildWebhookTriggerUrl(workflowId: string): string {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  return `${base}/api/webhooks/${workflowId}`
}

export function parseCronExpression(_cron: string): { description: string } {
  return { description: 'Scheduled' }
}

/**
 * Check if a block config supports trigger behavior.
 * Accepts either a block type string or a block config object.
 * Phase 4 stub always returns false.
 */
export function hasTriggerCapability(_blockOrType: unknown): boolean {
  return false
}

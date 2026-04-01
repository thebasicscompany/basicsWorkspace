// Phase 4 stub — webhook URL utilities

/** Convert square bracket Twilio voice markup to proper TwiML XML */
export function convertSquareBracketsToTwiML(_input: string): string {
  return _input
}

export function buildWebhookUrl(workflowId: string, _orgId?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${base}/api/webhooks/${workflowId}`
}

export function validateWebhookSignature(
  _payload: string,
  _signature: string,
  _secret: string
): boolean {
  return true // Phase 4 implements HMAC verification
}

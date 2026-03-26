// Phase 4 stub — rate limiter (no-op in Phase 3)

export interface HostedKeyRateLimitConfig {
  mode: 'rpm' | 'rps' | 'custom' | 'per_request'
  rpm?: number
  rps?: number
  requestsPerMinute?: number
  requestsPerSecond?: number
  maxConcurrent?: number
}

interface AcquireKeyResult {
  success: boolean
  key?: string
  envVarName?: string
  keyIndex?: number
  billingActorRateLimited?: boolean
  retryAfterMs?: number
  error?: string
}

interface ReportUsageResult {
  dimensions: { name: string; allowed: boolean; consumed: number; tokensRemaining?: number }[]
}

export function getHostedKeyRateLimiter() {
  return {
    check: async (_key: string): Promise<{ allowed: boolean; remaining: number }> => ({
      allowed: true,
      remaining: 999,
    }),
    acquireKey: async (
      _provider: string,
      _envKeyPrefix: string,
      _rateLimit: HostedKeyRateLimitConfig,
      _billingActorId: string
    ): Promise<AcquireKeyResult> => ({
      success: false,
      error: 'No hosted keys configured (Phase 3)',
    }),
    reportUsage: async (
      _provider: string,
      _billingActorId: string,
      _rateLimit: HostedKeyRateLimitConfig,
      _params: Record<string, unknown>,
      _response: Record<string, unknown>
    ): Promise<ReportUsageResult> => ({
      dimensions: [],
    }),
  }
}

// Phase 4 stub — telemetry events (no-op)
export const PlatformEvents = {
  track: (_event: string, _props?: Record<string, unknown>): void => {},
  hostedKeyUserThrottled: (_props?: Record<string, unknown>): void => {},
  hostedKeyRateLimited: (_props?: Record<string, unknown>): void => {},
  hostedKeyUnknownModelCost: (_props?: Record<string, unknown>): void => {},
}

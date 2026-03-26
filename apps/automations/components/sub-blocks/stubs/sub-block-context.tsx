/**
 * Stub for sub-block context exports (WandControlHandlers, etc.)
 */
export interface WandControlHandlers {
  onWandTrigger: (prompt: string) => void
  isWandActive: boolean
  isWandStreaming: boolean
}

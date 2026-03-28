export const DEFAULT_LOG_DETAILS_WIDTH = 480
export const MIN_LOG_DETAILS_WIDTH = 400
export const MAX_LOG_DETAILS_WIDTH_VW = 65

export function clampPanelWidth(width: number): number {
  const maxWidth = typeof window !== 'undefined' ? window.innerWidth * (MAX_LOG_DETAILS_WIDTH_VW / 100) : 1200
  return Math.min(Math.max(width, MIN_LOG_DETAILS_WIDTH), maxWidth)
}

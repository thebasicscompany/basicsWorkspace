export interface CapturedEvent {
  timestamp: number
  type: "click" | "keyInput" | "windowSwitch" | "scroll" | "clipboard"
  screenshotPath: string
  coordinates?: { x: number; y: number }
  textEntered?: string
  windowTitle?: string
  appName?: string
  screenWidth?: number
  screenHeight?: number
  scaleFactor?: number
  activeWindowBounds?: { x: number; y: number; width: number; height: number }
}

export interface RecorderStatus {
  recording: boolean
  sessionId: string | null
  eventCount: number
  startedAt: number | null
}

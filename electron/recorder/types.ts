export interface CapturedEvent {
  timestamp: number
  type: "click" | "keyInput" | "windowSwitch" | "scroll"
  screenshotPath: string
  coordinates?: { x: number; y: number }
  textEntered?: string
  windowTitle?: string
  appName?: string
}

export interface RecorderStatus {
  recording: boolean
  sessionId: string | null
  eventCount: number
  startedAt: number | null
}

import type { BrowserWindow } from "electron"
import type { CapturedEvent, RecorderStatus } from "./types"
import { initSessionDir } from "./capture"
import { startHooks, stopHooks } from "./hooks"
import { pushEvent, getEvents, getEventCount, clearBuffer } from "./buffer"
import { setRecordingState } from "./indicator"
import { openOverlay, closeOverlay, sendEventToOverlay } from "./overlay-window"

export class RecorderModule {
  private recording = false
  private sessionId: string | null = null
  private startedAt: number | null = null
  private getWindow: () => BrowserWindow | null

  constructor(getWindow: () => BrowserWindow | null) {
    this.getWindow = getWindow
  }

  async start(sessionId: string): Promise<{ ok: boolean }> {
    if (this.recording) return { ok: false }

    this.sessionId = sessionId
    this.recording = true
    this.startedAt = Date.now()

    clearBuffer()
    initSessionDir(sessionId)
    setRecordingState(true)
    openOverlay(this.startedAt, 0)

    startHooks(sessionId, (event: CapturedEvent) => {
      pushEvent(event)
      sendEventToOverlay()

      // Forward event to renderer for live UI updates
      const win = this.getWindow()
      if (win && !win.isDestroyed()) {
        const { screenshotPath, ...eventData } = event
        win.webContents.send("recorder:event", eventData)
      }
    })

    return { ok: true }
  }

  async stop(): Promise<{ events: CapturedEvent[]; duration: number }> {
    if (!this.recording) return { events: [], duration: 0 }

    stopHooks()
    setRecordingState(false)
    closeOverlay()

    const events = getEvents()
    const duration = this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0

    this.recording = false
    this.sessionId = null
    this.startedAt = null
    clearBuffer()

    return { events, duration }
  }

  getStatus(): RecorderStatus {
    return {
      recording: this.recording,
      sessionId: this.sessionId,
      eventCount: getEventCount(),
      startedAt: this.startedAt,
    }
  }
}

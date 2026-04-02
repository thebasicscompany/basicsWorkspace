import { ipcMain } from "electron"
import { RecorderModule } from "./recorder/index"
import { getMainWindow } from "./window"

let recorder: RecorderModule

/**
 * Register all IPC handlers.
 * Each feature module gets its own namespace (e.g. "recorder:*").
 */
export function registerIpcHandlers(): void {
  recorder = new RecorderModule(() => getMainWindow())

  // ── Recorder ──────────────────────────────────────────────
  ipcMain.handle("recorder:start", async (_event, sessionId: string) => {
    return recorder.start(sessionId)
  })

  ipcMain.handle("recorder:stop", async () => {
    return recorder.stop()
  })

  ipcMain.handle("recorder:status", () => {
    return recorder.getStatus()
  })

  // Stop from the floating overlay window
  ipcMain.on("recorder:stop-from-overlay", async () => {
    const result = await recorder.stop()

    // Notify the main renderer that recording stopped
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send("recorder:stopped", result)
    }
  })
}

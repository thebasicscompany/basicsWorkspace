import { BrowserWindow, screen } from "electron"
import * as path from "path"

let overlayWindow: BrowserWindow | null = null

export function openOverlay(startedAt: number, eventCount: number): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width: screenW } = display.workAreaSize

  overlayWindow = new BrowserWindow({
    width: 200,
    height: 38,
    x: screenW - 216,
    y: 16,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "overlay-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // __dirname at runtime = electron/dist/recorder/
  // overlay.html is at electron/recorder/overlay.html
  const htmlPath = path.join(__dirname, "..", "..", "recorder", "overlay.html")
  console.log("[overlay] loading:", htmlPath)
  overlayWindow.loadFile(htmlPath)

  overlayWindow.webContents.once("did-finish-load", () => {
    overlayWindow?.webContents.send("overlay:init", { startedAt, eventCount })
  })

  overlayWindow.on("closed", () => {
    overlayWindow = null
  })
}

export function closeOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
  }
  overlayWindow = null
}

export function sendEventToOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("overlay:event")
  }
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}

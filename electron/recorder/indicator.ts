import { Tray, Menu, nativeImage, app } from "electron"
import * as path from "path"

let tray: Tray | null = null

function createRecordingIcon(): Electron.NativeImage {
  // Red circle icon for recording state
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2
      const dy = y - size / 2
      const dist = Math.sqrt(dx * dx + dy * dy)
      const idx = (y * size + x) * 4

      if (dist < 6) {
        canvas[idx] = 239     // R
        canvas[idx + 1] = 68  // G
        canvas[idx + 2] = 68  // B
        canvas[idx + 3] = 255 // A
      } else {
        canvas[idx + 3] = 0
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

function getLogoIcon(): Electron.NativeImage {
  // __dirname at runtime = electron/dist/recorder/, so go up three levels to project root
  const logoPath = path.join(__dirname, "..", "..", "..", "public", "logo.png")
  try {
    const icon = nativeImage.createFromPath(logoPath)
    return icon.resize({ width: 16, height: 16 })
  } catch {
    // Fallback: gray circle if logo not found
    const size = 16
    const canvas = Buffer.alloc(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - size / 2
        const dy = y - size / 2
        const dist = Math.sqrt(dx * dx + dy * dy)
        const idx = (y * size + x) * 4
        if (dist < 6) {
          canvas[idx] = 156
          canvas[idx + 1] = 163
          canvas[idx + 2] = 175
          canvas[idx + 3] = 255
        } else {
          canvas[idx + 3] = 0
        }
      }
    }
    return nativeImage.createFromBuffer(canvas, { width: size, height: size })
  }
}

export function createTrayIndicator(): void {
  tray = new Tray(getLogoIcon())
  tray.setToolTip("Basics")
  updateTrayMenu(false)
}

function updateTrayMenu(recording: boolean): void {
  if (!tray) return

  const menu = Menu.buildFromTemplate([
    {
      label: recording ? "Recording..." : "Basics Recorder",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Open Basics",
      click: () => {
        const { getMainWindow } = require("./index")
        // not used directly — mainWindow focus would go here
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => app.quit(),
    },
  ])
  tray.setContextMenu(menu)
}

export function setRecordingState(recording: boolean): void {
  if (!tray) return
  tray.setImage(recording ? createRecordingIcon() : getLogoIcon())
  tray.setToolTip(recording ? "Basics — Recording" : "Basics")
  updateTrayMenu(recording)
}

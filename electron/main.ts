import { app } from "electron"
import { createMainWindow, getMainWindow } from "./window"
import { registerIpcHandlers } from "./ipc"
import { createTrayIndicator } from "./recorder/indicator"

app.whenReady().then(() => {
  registerIpcHandlers()
  createMainWindow()
  createTrayIndicator()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (getMainWindow() === null) {
    createMainWindow()
  }
})

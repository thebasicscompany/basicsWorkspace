import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("overlayAPI", {
  stop: () => ipcRenderer.send("recorder:stop-from-overlay"),
  onEvent: (cb: () => void) => {
    ipcRenderer.on("overlay:event", () => cb())
  },
  onInit: (cb: (data: { startedAt: number; eventCount: number }) => void) => {
    ipcRenderer.on("overlay:init", (_e, data) => cb(data))
  },
})

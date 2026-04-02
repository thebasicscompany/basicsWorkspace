import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
})

contextBridge.exposeInMainWorld("recorder", {
  startRecording: (sessionId: string) =>
    ipcRenderer.invoke("recorder:start", sessionId),

  stopRecording: () =>
    ipcRenderer.invoke("recorder:stop"),

  getStatus: () =>
    ipcRenderer.invoke("recorder:status"),

  onEvent: (cb: (event: unknown) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, event: unknown) => cb(event)
    ipcRenderer.on("recorder:event", handler)
    return () => ipcRenderer.removeListener("recorder:event", handler)
  },

  onStopped: (cb: (result: unknown) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, result: unknown) => cb(result)
    ipcRenderer.on("recorder:stopped", handler)
    return () => ipcRenderer.removeListener("recorder:stopped", handler)
  },
})

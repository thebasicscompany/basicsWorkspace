"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    isElectron: true,
    platform: process.platform,
});
electron_1.contextBridge.exposeInMainWorld("recorder", {
    startRecording: (sessionId) => electron_1.ipcRenderer.invoke("recorder:start", sessionId),
    stopRecording: () => electron_1.ipcRenderer.invoke("recorder:stop"),
    getStatus: () => electron_1.ipcRenderer.invoke("recorder:status"),
    onEvent: (cb) => {
        const handler = (_e, event) => cb(event);
        electron_1.ipcRenderer.on("recorder:event", handler);
        return () => electron_1.ipcRenderer.removeListener("recorder:event", handler);
    },
    onStopped: (cb) => {
        const handler = (_e, result) => cb(result);
        electron_1.ipcRenderer.on("recorder:stopped", handler);
        return () => electron_1.ipcRenderer.removeListener("recorder:stopped", handler);
    },
});
//# sourceMappingURL=preload.js.map
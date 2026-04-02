"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("overlayAPI", {
    stop: () => electron_1.ipcRenderer.send("recorder:stop-from-overlay"),
    onEvent: (cb) => {
        electron_1.ipcRenderer.on("overlay:event", () => cb());
    },
    onInit: (cb) => {
        electron_1.ipcRenderer.on("overlay:init", (_e, data) => cb(data));
    },
});
//# sourceMappingURL=overlay-preload.js.map
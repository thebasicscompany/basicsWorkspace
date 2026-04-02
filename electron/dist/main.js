"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const window_1 = require("./window");
const ipc_1 = require("./ipc");
const indicator_1 = require("./recorder/indicator");
electron_1.app.whenReady().then(() => {
    (0, ipc_1.registerIpcHandlers)();
    (0, window_1.createMainWindow)();
    (0, indicator_1.createTrayIndicator)();
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if ((0, window_1.getMainWindow)() === null) {
        (0, window_1.createMainWindow)();
    }
});
//# sourceMappingURL=main.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const index_1 = require("./recorder/index");
const window_1 = require("./window");
let recorder;
/**
 * Register all IPC handlers.
 * Each feature module gets its own namespace (e.g. "recorder:*").
 */
function registerIpcHandlers() {
    recorder = new index_1.RecorderModule(() => (0, window_1.getMainWindow)());
    // ── Recorder ──────────────────────────────────────────────
    electron_1.ipcMain.handle("recorder:start", async (_event, sessionId) => {
        return recorder.start(sessionId);
    });
    electron_1.ipcMain.handle("recorder:stop", async () => {
        return recorder.stop();
    });
    electron_1.ipcMain.handle("recorder:status", () => {
        return recorder.getStatus();
    });
    // Stop from the floating overlay window
    electron_1.ipcMain.on("recorder:stop-from-overlay", async () => {
        const result = await recorder.stop();
        // Notify the main renderer that recording stopped
        const win = (0, window_1.getMainWindow)();
        if (win && !win.isDestroyed()) {
            win.webContents.send("recorder:stopped", result);
        }
    });
}
//# sourceMappingURL=ipc.js.map
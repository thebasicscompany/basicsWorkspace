"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecorderModule = void 0;
const capture_1 = require("./capture");
const hooks_1 = require("./hooks");
const buffer_1 = require("./buffer");
const indicator_1 = require("./indicator");
const overlay_window_1 = require("./overlay-window");
class RecorderModule {
    constructor(getWindow) {
        this.recording = false;
        this.sessionId = null;
        this.startedAt = null;
        this.getWindow = getWindow;
    }
    async start(sessionId) {
        if (this.recording)
            return { ok: false };
        this.sessionId = sessionId;
        this.recording = true;
        this.startedAt = Date.now();
        (0, buffer_1.clearBuffer)();
        (0, capture_1.initSessionDir)(sessionId);
        (0, indicator_1.setRecordingState)(true);
        (0, overlay_window_1.openOverlay)(this.startedAt, 0);
        (0, hooks_1.startHooks)(sessionId, (event) => {
            (0, buffer_1.pushEvent)(event);
            (0, overlay_window_1.sendEventToOverlay)();
            // Forward event to renderer for live UI updates
            const win = this.getWindow();
            if (win && !win.isDestroyed()) {
                const { screenshotPath, ...eventData } = event;
                win.webContents.send("recorder:event", eventData);
            }
        });
        return { ok: true };
    }
    async stop() {
        if (!this.recording)
            return { events: [], duration: 0 };
        (0, hooks_1.stopHooks)();
        (0, indicator_1.setRecordingState)(false);
        (0, overlay_window_1.closeOverlay)();
        const events = (0, buffer_1.getEvents)();
        const duration = this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0;
        this.recording = false;
        this.sessionId = null;
        this.startedAt = null;
        (0, buffer_1.clearBuffer)();
        return { events, duration };
    }
    getStatus() {
        return {
            recording: this.recording,
            sessionId: this.sessionId,
            eventCount: (0, buffer_1.getEventCount)(),
            startedAt: this.startedAt,
        };
    }
}
exports.RecorderModule = RecorderModule;
//# sourceMappingURL=index.js.map
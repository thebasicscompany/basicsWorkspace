"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHooks = startHooks;
exports.stopHooks = stopHooks;
const uiohook_napi_1 = require("uiohook-napi");
const capture_1 = require("./capture");
let callback = null;
let sessionId = null;
let running = false;
// Keyboard buffer — accumulate keystrokes, flush after 500ms pause
let keyBuffer = "";
let keyTimer = null;
// Scroll debounce — capture after 300ms of no scrolling
let scrollTimer = null;
// Active window polling
let windowPollInterval = null;
let lastWindowTitle = "";
async function emitEvent(type, extra = {}) {
    if (!sessionId || !callback)
        return;
    try {
        const screenshotPath = await (0, capture_1.captureScreenshot)(sessionId);
        callback({
            timestamp: Date.now(),
            type,
            screenshotPath,
            ...extra,
        });
    }
    catch (err) {
        console.error("[recorder/hooks] Failed to capture event:", err);
    }
}
function handleClick(e) {
    emitEvent("click", { coordinates: { x: e.x, y: e.y } });
}
function handleKeydown() {
    // Buffer keystrokes, emit after 500ms pause
    keyBuffer += "?"; // We don't capture actual characters for privacy — just detect input activity
    if (keyTimer)
        clearTimeout(keyTimer);
    keyTimer = setTimeout(() => {
        if (keyBuffer.length > 0) {
            emitEvent("keyInput", { textEntered: `[${keyBuffer.length} keystrokes]` });
            keyBuffer = "";
        }
    }, 500);
}
function handleScroll() {
    if (scrollTimer)
        clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
        emitEvent("scroll");
    }, 300);
}
async function pollActiveWindow() {
    try {
        // active-win is ESM in v9+, CJS in v8
        const activeWin = require("active-win");
        const win = await activeWin();
        if (win && win.title !== lastWindowTitle) {
            lastWindowTitle = win.title;
            emitEvent("windowSwitch", {
                windowTitle: win.title,
                appName: win.owner?.name,
            });
        }
    }
    catch {
        // active-win may fail on some platforms — non-fatal
    }
}
function startHooks(id, cb) {
    if (running)
        return;
    sessionId = id;
    callback = cb;
    running = true;
    lastWindowTitle = "";
    keyBuffer = "";
    uiohook_napi_1.uIOhook.on("click", handleClick);
    uiohook_napi_1.uIOhook.on("keydown", handleKeydown);
    uiohook_napi_1.uIOhook.on("wheel", handleScroll);
    uiohook_napi_1.uIOhook.start();
    // Poll active window every 500ms
    windowPollInterval = setInterval(pollActiveWindow, 500);
}
function stopHooks() {
    if (!running)
        return;
    running = false;
    sessionId = null;
    callback = null;
    // Flush pending timers
    if (keyTimer) {
        clearTimeout(keyTimer);
        keyTimer = null;
    }
    if (scrollTimer) {
        clearTimeout(scrollTimer);
        scrollTimer = null;
    }
    if (windowPollInterval) {
        clearInterval(windowPollInterval);
        windowPollInterval = null;
    }
    uiohook_napi_1.uIOhook.removeAllListeners();
    uiohook_napi_1.uIOhook.stop();
}
//# sourceMappingURL=hooks.js.map
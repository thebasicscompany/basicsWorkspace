"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHooks = startHooks;
exports.stopHooks = stopHooks;
const uiohook_napi_1 = require("uiohook-napi");
const electron_1 = require("electron");
const crypto_1 = require("crypto");
const capture_1 = require("./capture");
const accessibility_1 = require("./accessibility");
let callback = null;
let sessionId = null;
let running = false;
// Keyboard buffer — accumulate keystrokes, flush after 500ms pause
let keyBuffer = "";
let keyTimer = null;
// Scroll debounce — capture after 300ms of no scrolling
let scrollTimer = null;
// Click debounce — 150ms window
let lastClickTime = 0;
// Screenshot deduplication
let lastScreenshotHash = "";
// Active window polling
let windowPollInterval = null;
let lastWindowTitle = "";
let lastAppName = "";
// Clipboard polling
let clipboardInterval = null;
let lastClipboardText = "";
function isDuplicateScreenshot(buffer) {
    const hash = (0, crypto_1.createHash)("sha256").update(buffer).digest("hex");
    if (hash === lastScreenshotHash)
        return true;
    lastScreenshotHash = hash;
    return false;
}
function getScreenMetadata() {
    try {
        const display = electron_1.screen.getPrimaryDisplay();
        return {
            screenWidth: display.size.width,
            screenHeight: display.size.height,
            scaleFactor: display.scaleFactor,
        };
    }
    catch {
        return {};
    }
}
async function getActiveWindowBounds() {
    try {
        const activeWin = require("active-win");
        const win = await activeWin();
        if (win?.bounds) {
            return {
                x: win.bounds.x,
                y: win.bounds.y,
                width: win.bounds.width,
                height: win.bounds.height,
            };
        }
    }
    catch {
        // non-fatal
    }
    return undefined;
}
async function emitEvent(type, extra = {}) {
    if (!sessionId || !callback)
        return;
    try {
        const { filepath, buffer } = await (0, capture_1.captureScreenshot)(sessionId);
        // Skip duplicate screenshots
        if (isDuplicateScreenshot(buffer))
            return;
        const screenMeta = getScreenMetadata();
        const activeWindowBounds = await getActiveWindowBounds();
        callback({
            timestamp: Date.now(),
            type,
            screenshotPath: filepath,
            windowTitle: lastWindowTitle,
            appName: lastAppName,
            ...screenMeta,
            activeWindowBounds,
            ...extra,
        });
    }
    catch (err) {
        console.error("[recorder/hooks] Failed to capture event:", err);
    }
}
async function handleClick(e) {
    const now = Date.now();
    if (now - lastClickTime < 150)
        return;
    lastClickTime = now;
    // Fire a11y lookup in parallel with screenshot capture
    const elementUnderCursor = await (0, accessibility_1.getElementAtPoint)(e.x, e.y).catch(() => null);
    emitEvent("click", {
        coordinates: { x: e.x, y: e.y },
        ...(elementUnderCursor ? { elementUnderCursor } : {}),
    });
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
        const activeWin = require("active-win");
        const win = await activeWin();
        if (win && win.title !== lastWindowTitle) {
            lastWindowTitle = win.title;
            lastAppName = win.owner?.name || "";
            emitEvent("windowSwitch", {
                windowTitle: win.title,
                appName: lastAppName,
            });
        }
    }
    catch {
        // active-win may fail on some platforms — non-fatal
    }
}
function pollClipboard() {
    try {
        const text = electron_1.clipboard.readText();
        if (text && text !== lastClipboardText && text.length > 0) {
            lastClipboardText = text;
            emitEvent("clipboard", { textEntered: text });
        }
    }
    catch {
        // clipboard read may fail — non-fatal
    }
}
function startHooks(id, cb) {
    if (running)
        return;
    sessionId = id;
    callback = cb;
    running = true;
    lastWindowTitle = "";
    lastAppName = "";
    keyBuffer = "";
    lastClickTime = 0;
    lastScreenshotHash = "";
    lastClipboardText = "";
    uiohook_napi_1.uIOhook.on("click", handleClick);
    uiohook_napi_1.uIOhook.on("keydown", handleKeydown);
    uiohook_napi_1.uIOhook.on("wheel", handleScroll);
    uiohook_napi_1.uIOhook.start();
    // Poll active window every 500ms
    windowPollInterval = setInterval(pollActiveWindow, 500);
    // Poll clipboard every 1s
    clipboardInterval = setInterval(pollClipboard, 1000);
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
    if (clipboardInterval) {
        clearInterval(clipboardInterval);
        clipboardInterval = null;
    }
    uiohook_napi_1.uIOhook.removeAllListeners();
    uiohook_napi_1.uIOhook.stop();
}
//# sourceMappingURL=hooks.js.map
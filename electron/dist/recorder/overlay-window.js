"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.openOverlay = openOverlay;
exports.closeOverlay = closeOverlay;
exports.sendEventToOverlay = sendEventToOverlay;
exports.getOverlayWindow = getOverlayWindow;
const electron_1 = require("electron");
const path = __importStar(require("path"));
let overlayWindow = null;
function openOverlay(startedAt, eventCount) {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.focus();
        return;
    }
    const display = electron_1.screen.getPrimaryDisplay();
    const { width: screenW } = display.workAreaSize;
    overlayWindow = new electron_1.BrowserWindow({
        width: 200,
        height: 38,
        x: screenW - 216,
        y: 16,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, "overlay-preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    // __dirname at runtime = electron/dist/recorder/
    // overlay.html is at electron/recorder/overlay.html
    const htmlPath = path.join(__dirname, "..", "..", "recorder", "overlay.html");
    console.log("[overlay] loading:", htmlPath);
    overlayWindow.loadFile(htmlPath);
    overlayWindow.webContents.once("did-finish-load", () => {
        overlayWindow?.webContents.send("overlay:init", { startedAt, eventCount });
    });
    overlayWindow.on("closed", () => {
        overlayWindow = null;
    });
}
function closeOverlay() {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.close();
    }
    overlayWindow = null;
}
function sendEventToOverlay() {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send("overlay:event");
    }
}
function getOverlayWindow() {
    return overlayWindow;
}
//# sourceMappingURL=overlay-window.js.map
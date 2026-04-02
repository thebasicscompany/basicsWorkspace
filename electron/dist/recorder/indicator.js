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
exports.createTrayIndicator = createTrayIndicator;
exports.setRecordingState = setRecordingState;
const electron_1 = require("electron");
const path = __importStar(require("path"));
let tray = null;
function createRecordingIcon() {
    // Red circle icon for recording state
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - size / 2;
            const dy = y - size / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const idx = (y * size + x) * 4;
            if (dist < 6) {
                canvas[idx] = 239; // R
                canvas[idx + 1] = 68; // G
                canvas[idx + 2] = 68; // B
                canvas[idx + 3] = 255; // A
            }
            else {
                canvas[idx + 3] = 0;
            }
        }
    }
    return electron_1.nativeImage.createFromBuffer(canvas, { width: size, height: size });
}
function getLogoIcon() {
    // __dirname at runtime = electron/dist/recorder/, so go up three levels to project root
    const logoPath = path.join(__dirname, "..", "..", "..", "public", "logo.png");
    try {
        const icon = electron_1.nativeImage.createFromPath(logoPath);
        return icon.resize({ width: 16, height: 16 });
    }
    catch {
        // Fallback: gray circle if logo not found
        const size = 16;
        const canvas = Buffer.alloc(size * size * 4);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - size / 2;
                const dy = y - size / 2;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const idx = (y * size + x) * 4;
                if (dist < 6) {
                    canvas[idx] = 156;
                    canvas[idx + 1] = 163;
                    canvas[idx + 2] = 175;
                    canvas[idx + 3] = 255;
                }
                else {
                    canvas[idx + 3] = 0;
                }
            }
        }
        return electron_1.nativeImage.createFromBuffer(canvas, { width: size, height: size });
    }
}
function createTrayIndicator() {
    tray = new electron_1.Tray(getLogoIcon());
    tray.setToolTip("Basics");
    updateTrayMenu(false);
}
function updateTrayMenu(recording) {
    if (!tray)
        return;
    const menu = electron_1.Menu.buildFromTemplate([
        {
            label: recording ? "Recording..." : "Basics Recorder",
            enabled: false,
        },
        { type: "separator" },
        {
            label: "Open Basics",
            click: () => {
                const { getMainWindow } = require("./index");
                // not used directly — mainWindow focus would go here
            },
        },
        { type: "separator" },
        {
            label: "Quit",
            click: () => electron_1.app.quit(),
        },
    ]);
    tray.setContextMenu(menu);
}
function setRecordingState(recording) {
    if (!tray)
        return;
    tray.setImage(recording ? createRecordingIcon() : getLogoIcon());
    tray.setToolTip(recording ? "Basics — Recording" : "Basics");
    updateTrayMenu(recording);
}
//# sourceMappingURL=indicator.js.map
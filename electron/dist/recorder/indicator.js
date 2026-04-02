"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTrayIndicator = createTrayIndicator;
exports.setRecordingState = setRecordingState;
const electron_1 = require("electron");
let tray = null;
function createIcon(recording) {
    // Create a simple 16x16 icon programmatically
    // Idle: gray circle, Recording: red circle
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4); // RGBA
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - size / 2;
            const dy = y - size / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const idx = (y * size + x) * 4;
            if (dist < 6) {
                if (recording) {
                    canvas[idx] = 239; // R
                    canvas[idx + 1] = 68; // G
                    canvas[idx + 2] = 68; // B
                    canvas[idx + 3] = 255; // A
                }
                else {
                    canvas[idx] = 156;
                    canvas[idx + 1] = 163;
                    canvas[idx + 2] = 175;
                    canvas[idx + 3] = 255;
                }
            }
            else {
                canvas[idx + 3] = 0; // transparent
            }
        }
    }
    return electron_1.nativeImage.createFromBuffer(canvas, { width: size, height: size });
}
function createTrayIndicator() {
    tray = new electron_1.Tray(createIcon(false));
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
    tray.setImage(createIcon(recording));
    tray.setToolTip(recording ? "Basics — Recording" : "Basics");
    updateTrayMenu(recording);
}
//# sourceMappingURL=indicator.js.map
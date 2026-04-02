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
exports.initSessionDir = initSessionDir;
exports.getSessionDir = getSessionDir;
exports.cleanupSessionDir = cleanupSessionDir;
exports.captureScreenshot = captureScreenshot;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
let sessionDir = null;
// Cache: avoid redundant desktopCapturer.getSources() calls for rapid events
let cachedBuffer = null;
let cachedAt = 0;
const CACHE_TTL_MS = 100;
function initSessionDir(sessionId) {
    sessionDir = path.join(os.tmpdir(), "basics-recordings", sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });
    return sessionDir;
}
function getSessionDir() {
    return sessionDir;
}
function cleanupSessionDir() {
    if (sessionDir && fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    sessionDir = null;
}
async function captureScreenshot(sessionId) {
    const dir = sessionDir || initSessionDir(sessionId);
    const now = Date.now();
    const filename = `${now}.jpg`;
    const filepath = path.join(dir, filename);
    let jpeg;
    // Reuse cached frame if within TTL
    if (cachedBuffer && now - cachedAt < CACHE_TTL_MS) {
        jpeg = cachedBuffer;
    }
    else {
        const sources = await electron_1.desktopCapturer.getSources({
            types: ["screen"],
            thumbnailSize: { width: 1920, height: 1080 },
        });
        if (sources.length === 0) {
            throw new Error("No screen sources available");
        }
        jpeg = sources[0].thumbnail.toJPEG(80);
        cachedBuffer = jpeg;
        cachedAt = now;
    }
    fs.writeFileSync(filepath, jpeg);
    return { filepath, buffer: jpeg };
}
//# sourceMappingURL=capture.js.map
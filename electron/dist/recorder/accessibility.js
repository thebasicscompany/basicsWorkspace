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
exports.getElementAtPoint = getElementAtPoint;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = __importStar(require("path"));
/**
 * Get the accessibility node at a specific screen coordinate.
 * Windows: UI Automation via PowerShell (~100ms).
 * macOS: AXUIElementCopyElementAtPosition via compiled Swift helper (~20ms after first compile).
 */
async function getElementAtPoint(x, y) {
    if (process.platform === "win32") {
        return getElementAtPointWindows(x, y);
    }
    if (process.platform === "darwin") {
        return getElementAtPointMacOS(x, y);
    }
    return null;
}
// ---------------------------------------------------------------------------
// Windows — PowerShell + UI Automation
// ---------------------------------------------------------------------------
const PS_SCRIPT = (x, y) => `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName PresentationCore

$point = New-Object System.Windows.Point(${x}, ${y})
try {
  $el = [System.Windows.Automation.AutomationElement]::FromPoint($point)
  if ($el) {
    $role = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\\.', ''
    $name = $el.Current.Name
    $rect = $el.Current.BoundingRectangle

    $value = ''
    try {
      $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
      if ($vp) { $value = $vp.Current.Value }
    } catch {}

    @{
      role = $role
      name = if ($name) { $name } else { '' }
      value = if ($value) { $value } else { '' }
      bounds = @{
        x = [int]$rect.X
        y = [int]$rect.Y
        width = [int]$rect.Width
        height = [int]$rect.Height
      }
    } | ConvertTo-Json -Compress
  } else {
    'null'
  }
} catch {
  'null'
}
`;
function getElementAtPointWindows(x, y) {
    return new Promise((resolve) => {
        (0, child_process_1.execFile)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", PS_SCRIPT(x, y)], { timeout: 2000 }, (err, stdout) => {
            if (err) {
                console.error("[accessibility] PowerShell error:", err.message);
                resolve(null);
                return;
            }
            resolve(parseA11yOutput(stdout));
        });
    });
}
// ---------------------------------------------------------------------------
// macOS — Swift helper using Accessibility API
// ---------------------------------------------------------------------------
const SWIFT_SRC = path.join(__dirname, "a11y-helper-macos.swift");
const SWIFT_BIN = path.join(__dirname, "a11y-helper-macos");
let macOSBinaryReady = null;
function ensureMacOSBinary() {
    if (macOSBinaryReady)
        return macOSBinaryReady;
    macOSBinaryReady = new Promise((resolve) => {
        // Already compiled
        if ((0, fs_1.existsSync)(SWIFT_BIN)) {
            resolve(true);
            return;
        }
        // Compile the Swift helper once
        console.log("[accessibility] Compiling macOS a11y helper...");
        (0, child_process_1.execFile)("swiftc", ["-O", "-o", SWIFT_BIN, SWIFT_SRC], { timeout: 30000 }, (err) => {
            if (err) {
                console.error("[accessibility] Failed to compile Swift helper:", err.message);
                macOSBinaryReady = null; // Allow retry
                resolve(false);
                return;
            }
            console.log("[accessibility] macOS a11y helper compiled successfully");
            resolve(true);
        });
    });
    return macOSBinaryReady;
}
function getElementAtPointMacOS(x, y) {
    return new Promise(async (resolve) => {
        const ready = await ensureMacOSBinary();
        if (!ready) {
            resolve(null);
            return;
        }
        (0, child_process_1.execFile)(SWIFT_BIN, [String(x), String(y)], { timeout: 2000 }, (err, stdout) => {
            if (err) {
                console.error("[accessibility] macOS helper error:", err.message);
                resolve(null);
                return;
            }
            resolve(parseA11yOutput(stdout));
        });
    });
}
// ---------------------------------------------------------------------------
// Shared JSON parser
// ---------------------------------------------------------------------------
function parseA11yOutput(stdout) {
    const trimmed = stdout.trim();
    if (!trimmed || trimmed === "null")
        return null;
    try {
        const parsed = JSON.parse(trimmed);
        return {
            role: parsed.role || "Unknown",
            name: parsed.name || "",
            value: parsed.value || undefined,
            bounds: parsed.bounds
                ? {
                    x: parsed.bounds.x,
                    y: parsed.bounds.y,
                    width: parsed.bounds.width,
                    height: parsed.bounds.height,
                }
                : undefined,
        };
    }
    catch {
        console.error("[accessibility] Failed to parse output:", trimmed);
        return null;
    }
}
//# sourceMappingURL=accessibility.js.map
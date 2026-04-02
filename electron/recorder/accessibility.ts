import { execFile } from "child_process"
import { existsSync } from "fs"
import * as path from "path"
import type { AccessibilityNode } from "./types"

/**
 * Get the accessibility node at a specific screen coordinate.
 * Windows: UI Automation via PowerShell (~100ms).
 * macOS: AXUIElementCopyElementAtPosition via compiled Swift helper (~20ms after first compile).
 */
export async function getElementAtPoint(
  x: number,
  y: number
): Promise<AccessibilityNode | null> {
  if (process.platform === "win32") {
    return getElementAtPointWindows(x, y)
  }

  if (process.platform === "darwin") {
    return getElementAtPointMacOS(x, y)
  }

  return null
}

// ---------------------------------------------------------------------------
// Windows — PowerShell + UI Automation
// ---------------------------------------------------------------------------

const PS_SCRIPT = (x: number, y: number) => `
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
`

function getElementAtPointWindows(
  x: number,
  y: number
): Promise<AccessibilityNode | null> {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", PS_SCRIPT(x, y)],
      { timeout: 2000 },
      (err, stdout) => {
        if (err) {
          console.error("[accessibility] PowerShell error:", err.message)
          resolve(null)
          return
        }
        resolve(parseA11yOutput(stdout))
      }
    )
  })
}

// ---------------------------------------------------------------------------
// macOS — Swift helper using Accessibility API
// ---------------------------------------------------------------------------

const SWIFT_SRC = path.join(__dirname, "a11y-helper-macos.swift")
const SWIFT_BIN = path.join(__dirname, "a11y-helper-macos")

let macOSBinaryReady: Promise<boolean> | null = null

function ensureMacOSBinary(): Promise<boolean> {
  if (macOSBinaryReady) return macOSBinaryReady

  macOSBinaryReady = new Promise((resolve) => {
    // Already compiled
    if (existsSync(SWIFT_BIN)) {
      resolve(true)
      return
    }

    // Compile the Swift helper once
    console.log("[accessibility] Compiling macOS a11y helper...")
    execFile(
      "swiftc",
      ["-O", "-o", SWIFT_BIN, SWIFT_SRC],
      { timeout: 30000 },
      (err) => {
        if (err) {
          console.error("[accessibility] Failed to compile Swift helper:", err.message)
          macOSBinaryReady = null // Allow retry
          resolve(false)
          return
        }
        console.log("[accessibility] macOS a11y helper compiled successfully")
        resolve(true)
      }
    )
  })

  return macOSBinaryReady
}

function getElementAtPointMacOS(
  x: number,
  y: number
): Promise<AccessibilityNode | null> {
  return new Promise(async (resolve) => {
    const ready = await ensureMacOSBinary()
    if (!ready) {
      resolve(null)
      return
    }

    execFile(
      SWIFT_BIN,
      [String(x), String(y)],
      { timeout: 2000 },
      (err, stdout) => {
        if (err) {
          console.error("[accessibility] macOS helper error:", err.message)
          resolve(null)
          return
        }
        resolve(parseA11yOutput(stdout))
      }
    )
  })
}

// ---------------------------------------------------------------------------
// Shared JSON parser
// ---------------------------------------------------------------------------

function parseA11yOutput(stdout: string): AccessibilityNode | null {
  const trimmed = stdout.trim()
  if (!trimmed || trimmed === "null") return null

  try {
    const parsed = JSON.parse(trimmed)
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
    }
  } catch {
    console.error("[accessibility] Failed to parse output:", trimmed)
    return null
  }
}

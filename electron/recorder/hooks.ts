import { uIOhook } from "uiohook-napi"
import { screen, clipboard } from "electron"
import { createHash } from "crypto"
import type { CapturedEvent } from "./types"
import { captureScreenshot } from "./capture"
import { getElementAtPoint } from "./accessibility"

type EventCallback = (event: CapturedEvent) => void

let callback: EventCallback | null = null
let sessionId: string | null = null
let running = false

// Keyboard buffer — accumulate keystrokes, flush after 500ms pause
let keyBuffer = ""
let keyTimer: ReturnType<typeof setTimeout> | null = null

// Scroll debounce — capture after 300ms of no scrolling
let scrollTimer: ReturnType<typeof setTimeout> | null = null

// Click debounce — 150ms window
let lastClickTime = 0

// Screenshot deduplication
let lastScreenshotHash = ""

// Active window polling
let windowPollInterval: ReturnType<typeof setInterval> | null = null
let lastWindowTitle = ""
let lastAppName = ""

// Clipboard polling
let clipboardInterval: ReturnType<typeof setInterval> | null = null
let lastClipboardText = ""

function isDuplicateScreenshot(buffer: Buffer): boolean {
  const hash = createHash("sha256").update(buffer).digest("hex")
  if (hash === lastScreenshotHash) return true
  lastScreenshotHash = hash
  return false
}

function getScreenMetadata(): Pick<CapturedEvent, "screenWidth" | "screenHeight" | "scaleFactor"> {
  try {
    const display = screen.getPrimaryDisplay()
    return {
      screenWidth: display.size.width,
      screenHeight: display.size.height,
      scaleFactor: display.scaleFactor,
    }
  } catch {
    return {}
  }
}

async function getActiveWindowBounds(): Promise<CapturedEvent["activeWindowBounds"]> {
  try {
    const activeWin = require("active-win")
    const win = await activeWin()
    if (win?.bounds) {
      return {
        x: win.bounds.x,
        y: win.bounds.y,
        width: win.bounds.width,
        height: win.bounds.height,
      }
    }
  } catch {
    // non-fatal
  }
  return undefined
}

async function emitEvent(
  type: CapturedEvent["type"],
  extra: Partial<CapturedEvent> = {}
): Promise<void> {
  if (!sessionId || !callback) return

  try {
    const { filepath, buffer } = await captureScreenshot(sessionId)

    // Skip duplicate screenshots
    if (isDuplicateScreenshot(buffer)) return

    const screenMeta = getScreenMetadata()
    const activeWindowBounds = await getActiveWindowBounds()

    callback({
      timestamp: Date.now(),
      type,
      screenshotPath: filepath,
      windowTitle: lastWindowTitle,
      appName: lastAppName,
      ...screenMeta,
      activeWindowBounds,
      ...extra,
    })
  } catch (err) {
    console.error("[recorder/hooks] Failed to capture event:", err)
  }
}

async function handleClick(e: { x: number; y: number }): Promise<void> {
  const now = Date.now()
  if (now - lastClickTime < 150) return
  lastClickTime = now

  // Fire a11y lookup in parallel with screenshot capture
  const elementUnderCursor = await getElementAtPoint(e.x, e.y).catch(() => null)
  emitEvent("click", {
    coordinates: { x: e.x, y: e.y },
    ...(elementUnderCursor ? { elementUnderCursor } : {}),
  })
}

function handleKeydown(): void {
  // Buffer keystrokes, emit after 500ms pause
  keyBuffer += "?"  // We don't capture actual characters for privacy — just detect input activity
  if (keyTimer) clearTimeout(keyTimer)
  keyTimer = setTimeout(() => {
    if (keyBuffer.length > 0) {
      emitEvent("keyInput", { textEntered: `[${keyBuffer.length} keystrokes]` })
      keyBuffer = ""
    }
  }, 500)
}

function handleScroll(): void {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    emitEvent("scroll")
  }, 300)
}

async function pollActiveWindow(): Promise<void> {
  try {
    const activeWin = require("active-win")
    const win = await activeWin()
    if (win && win.title !== lastWindowTitle) {
      lastWindowTitle = win.title
      lastAppName = win.owner?.name || ""
      emitEvent("windowSwitch", {
        windowTitle: win.title,
        appName: lastAppName,
      })
    }
  } catch {
    // active-win may fail on some platforms — non-fatal
  }
}

function pollClipboard(): void {
  try {
    const text = clipboard.readText()
    if (text && text !== lastClipboardText && text.length > 0) {
      lastClipboardText = text
      emitEvent("clipboard", { textEntered: text })
    }
  } catch {
    // clipboard read may fail — non-fatal
  }
}

export function startHooks(id: string, cb: EventCallback): void {
  if (running) return

  sessionId = id
  callback = cb
  running = true
  lastWindowTitle = ""
  lastAppName = ""
  keyBuffer = ""
  lastClickTime = 0
  lastScreenshotHash = ""
  lastClipboardText = ""

  uIOhook.on("click", handleClick)
  uIOhook.on("keydown", handleKeydown)
  uIOhook.on("wheel", handleScroll)
  uIOhook.start()

  // Poll active window every 500ms
  windowPollInterval = setInterval(pollActiveWindow, 500)

  // Poll clipboard every 1s
  clipboardInterval = setInterval(pollClipboard, 1000)
}

export function stopHooks(): void {
  if (!running) return

  running = false
  sessionId = null
  callback = null

  // Flush pending timers
  if (keyTimer) { clearTimeout(keyTimer); keyTimer = null }
  if (scrollTimer) { clearTimeout(scrollTimer); scrollTimer = null }
  if (windowPollInterval) { clearInterval(windowPollInterval); windowPollInterval = null }
  if (clipboardInterval) { clearInterval(clipboardInterval); clipboardInterval = null }

  uIOhook.removeAllListeners()
  uIOhook.stop()
}

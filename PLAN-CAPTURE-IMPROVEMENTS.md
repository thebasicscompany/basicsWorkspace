# Capture Pipeline Improvements — Implementation Plan

> Improving the recording system from MVP to production quality, with a path to continuous monitoring via Screenpipe integration.

---

## Current State (what exists)

```
electron/recorder/
├── capture.ts       — desktopCapturer.getSources() per event, saves PNG to temp dir
├── hooks.ts         — uiohook-napi: click, keydown (500ms debounce), scroll (300ms debounce), window poll
├── buffer.ts        — in-memory CapturedEvent[] accumulator
├── indicator.ts     — system tray icon (idle/recording)
├── overlay-window.ts — floating always-on-top pill (timer, event count, stop)
├── overlay.html     — overlay UI
├── overlay-preload.ts
├── index.ts         — RecorderModule class orchestrating start/stop
└── types.ts         — CapturedEvent, RecorderStatus interfaces
```

**Recording flow:** User clicks Start → `uiohook-napi` listens for global input → on each event, calls `desktopCapturer.getSources()` for a full-screen PNG → saves to temp dir → buffers event metadata → on Stop, flushes events to `POST /api/recordings/[id]` via PATCH.

**Understanding flow:** User clicks Understand on recording detail page → `POST /api/recordings/[id]/understand` reads events from DB → loads screenshots from disk as base64 → sends to vision LLM via gateway → returns structured `UnderstoodAction[]` → saved to `structuredActions` column.

---

## Problems with Current Approach

| Problem | Impact | Fix |
|---------|--------|-----|
| `desktopCapturer.getSources()` called per event | Slow (~200-500ms per call), fetches ALL displays, blocks main process | Switch to persistent MediaStream, grab frames on demand |
| PNG screenshots | ~2-5MB per screenshot, wasteful for vision LLM input | JPEG quality 80, ~200-500KB each |
| No deduplication | Rapid clicks produce identical screenshots | SHA-256 hash comparison, skip duplicates |
| No debounce on clicks | Double-clicks, drag operations produce noisy events | 150ms debounce window for clicks |
| No accessibility tree | LLM guesses UI elements from pixels alone | Capture OS a11y data per event — dramatically improves understanding |
| No screen resolution/DPI metadata | LLM can't reason about coordinate meaning | Record display info per event |
| No clipboard capture | Misses copy/paste workflows | Capture clipboard on change events |
| Screenshots stored as files only | Can't review in browser, hard to send to LLM | Store as base64 in DB or upload to object storage |
| No active window bounds | Full-screen screenshots waste LLM tokens on irrelevant UI | Record window bounds, optionally crop |

---

## Phase C1: Quick Wins (do first)

These are small changes to existing files, no new dependencies.

### C1.1: Persistent capture stream

**File:** `electron/recorder/capture.ts`

Replace `desktopCapturer.getSources()` per-event with a persistent `MediaStream`:

```
On recording start:
  1. Call desktopCapturer.getSources({ types: ['screen'] }) ONCE to get source ID
  2. Create a hidden BrowserWindow that calls navigator.mediaDevices.getUserMedia({ video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } } })
  3. Draw frames to an OffscreenCanvas
  4. On each event, grab current frame from canvas → toBlob('image/jpeg', 0.8)

On recording stop:
  5. Stop the MediaStream, close the hidden window
```

Alternative simpler approach: use Electron's `NativeImage` from a single `desktopCapturer.getSources()` call but cache aggressively — only re-capture if >100ms since last capture.

### C1.2: JPEG instead of PNG

**File:** `electron/recorder/capture.ts`

Change `sources[0].thumbnail.toPNG()` → `sources[0].thumbnail.toJPEG(80)` and save as `.jpg`. Update file extension references.

### C1.3: Screenshot deduplication

**File:** `electron/recorder/hooks.ts`

```ts
import { createHash } from 'crypto'

let lastScreenshotHash = ''

function isDuplicate(buffer: Buffer): boolean {
  const hash = createHash('sha256').update(buffer).digest('hex')
  if (hash === lastScreenshotHash) return true
  lastScreenshotHash = hash
  return false
}
```

Before emitting an event, check `isDuplicate(screenshotBuffer)`. If true, skip the event entirely.

### C1.4: Click debounce

**File:** `electron/recorder/hooks.ts`

Add 150ms debounce to click handler (currently has no debounce):

```ts
let lastClickTime = 0
function handleClick(e) {
  const now = Date.now()
  if (now - lastClickTime < 150) return
  lastClickTime = now
  emitEvent('click', { coordinates: { x: e.x, y: e.y } })
}
```

### C1.5: Extra metadata per event

**File:** `electron/recorder/types.ts` — extend `CapturedEvent`:

```ts
interface CapturedEvent {
  // ... existing fields ...
  screenWidth?: number
  screenHeight?: number
  scaleFactor?: number
  activeWindowBounds?: { x: number; y: number; width: number; height: number }
}
```

**File:** `electron/recorder/hooks.ts` — populate from `screen.getPrimaryDisplay()` and `active-win` result.

### C1.6: Clipboard capture

**File:** `electron/recorder/hooks.ts`

```ts
import { clipboard } from 'electron'

let lastClipboard = ''

// Poll clipboard every 1s during recording
clipboardInterval = setInterval(() => {
  const text = clipboard.readText()
  if (text !== lastClipboard && text.length > 0) {
    lastClipboard = text
    emitEvent('clipboard', { textEntered: text })
  }
}, 1000)
```

Add `'clipboard'` to the `CapturedEvent.type` union.

---

## Phase C2: Accessibility Tree Capture

This is the most impactful improvement for understanding quality. The accessibility tree gives structured semantic data (button labels, text field contents, element types, roles) that the LLM would otherwise have to guess from pixels.

### What to capture per event

```ts
interface AccessibilityNode {
  role: string          // "Button", "TextField", "Link", "MenuItem", etc.
  name: string          // "Send", "Search", "File menu", etc.
  value?: string        // current value for inputs
  bounds?: { x: number; y: number; width: number; height: number }
}

interface CapturedEvent {
  // ... existing fields ...
  elementUnderCursor?: AccessibilityNode  // the a11y node at click coordinates
  activeWindowTree?: AccessibilityNode[]  // optional: full tree of active window
}
```

### Windows implementation

Use **UI Automation** via a PowerShell script or native Node addon.

**Option A: PowerShell (simpler, slower ~100ms):**

```powershell
Add-Type -AssemblyName UIAutomationClient
$auto = [System.Windows.Automation.AutomationElement]
$point = New-Object System.Windows.Point($x, $y)
$element = $auto::FromPoint($point)
@{
  role = $element.Current.ControlType.ProgrammaticName
  name = $element.Current.Name
  value = $element.GetCurrentPropertyValue([System.Windows.Automation.ValuePattern]::ValueProperty)
  bounds = $element.Current.BoundingRectangle
} | ConvertTo-Json
```

Call from Node with `child_process.execFile('powershell', ...)`.

**Option B: Native Node addon (faster ~5ms, more work):**

Use `@aspect-build/winui-automation` or build a small N-API addon wrapping `IUIAutomation::ElementFromPoint()`. Faster but requires native compilation.

### macOS implementation

Use **Accessibility API** via a Swift helper or `@aspect-build/macos-accessibility`.

The app needs the "Accessibility" permission in System Preferences (similar to screen recording permission — must guide the user).

### Recommendation

Start with **PowerShell on Windows** (Option A) — it's 10 lines, no native build toolchain, and 100ms latency is fine for event-driven capture. Optimize to native addon later if needed.

Create: `electron/recorder/accessibility.ts`

```ts
export async function getElementAtPoint(x: number, y: number): Promise<AccessibilityNode | null>
export async function getActiveWindowTree(): Promise<AccessibilityNode[] | null>
```

Platform-specific implementations behind `process.platform` check.

---

## Phase C3: Screenpipe Integration (continuous monitoring)

This is the future "always-on" mode. Instead of building continuous capture ourselves, use Screenpipe as a sidecar process.

### Architecture

```
┌─────────────────────────────────────────────────┐
│                Electron App                      │
│                                                  │
│  Session Recording          Continuous Monitoring │
│  (our recorder module)      (Screenpipe sidecar)  │
│       │                           │               │
│       └──────────┬────────────────┘               │
│                  │                                │
│         Understanding API                         │
│         (vision LLM via gateway)                  │
│                  │                                │
│         Workflow Generator                        │
│         (map actions → canvas blocks)             │
│                  │                                │
│              Canvas                               │
└──────────────────────────────────────────────────┘
```

### How Screenpipe runs as sidecar

1. **Bundle the Screenpipe CLI binary** alongside the Electron app (or require separate install)
2. On app launch, spawn `screenpipe record` as a child process on port 3030
3. Use `@screenpipe/js` SDK to query and subscribe to events
4. Create a **custom Screenpipe pipe** that detects repetitive patterns

### Integration points

**Subscribing to events:**
```ts
import { pipe } from '@screenpipe/js'

// Query recent screen activity
const results = await pipe.queryScreenpipe({
  contentType: 'all',
  startTime: fifteenMinutesAgo.toISOString(),
  limit: 100,
  includeFrames: true, // base64 screenshots
})
```

**Accessing accessibility data:**
```ts
// Get interactable elements in an app
const elements = await pipe.operator.getInteractableElements({ app: 'Chrome' })
// Returns: { elements: [{ role, text, position, size, elementId }] }
```

**Real-time event stream:**
Screenpipe exposes SSE endpoints for real-time vision/transcription events. Subscribe from the Electron main process and forward interesting events to the renderer.

### Custom pattern detection pipe

Create `~/.screenpipe/pipes/basics-pattern-detector/pipe.md`:

```yaml
---
schedule: every 30m
enabled: true
provider: basics-gateway
model: basics-chat-smart-openai
permissions:
  allow: [Content(ocr), Content(ui)]
  deny: [App(1Password), App(KeePass)]
---

Query the last 30 minutes of screen activity. Look for repeated sequences:
- Same app + same window title + similar actions appearing 3+ times
- Copy/paste patterns between two apps
- Repetitive form filling
- Manual data transfer between systems

If you find a pattern, describe it as a workflow that could be automated,
and call POST http://localhost:3000/api/recordings with the pattern data.
```

### Screenpipe data we'd use

| Screenpipe field | Our use |
|---|---|
| `ocr.text` | What was on screen (better than raw pixels for text-heavy workflows) |
| `ocr.appName` + `windowName` | Which app the user was in |
| `ui.text` + accessibility tree | Structured element data (button labels, field contents) |
| `audio.transcription` | What the user said (for voice-driven workflows) |
| `input events` (click, key, app_switch) | Raw interaction events with element context |
| `frames` (base64 screenshots) | Visual context for the understanding LLM |

### Privacy controls

- Configure `ignoredWindows` to exclude password managers, banking apps
- Use pipe permissions to restrict what data each analysis pipe can access
- All data stays local (Screenpipe uses local SQLite at `~/.screenpipe/`)
- PII removal module available behind feature flag

### When to build this

Phase C3 is a **separate project** from improving the session recorder. Prerequisites:
- Session recording (R1) working well ✅
- Understanding pipeline (R2) working well ✅
- Workflow generation (R3) working
- Screenpipe installed or bundled

The trigger for starting C3 is when you want to move from "user records a task" to "system notices repeated patterns and suggests automations."

---

## Implementation Order

```
C1 (quick wins)          ✅ DONE
  C1.2: JPEG              ✅ capture.ts → toJPEG(80), .jpg extension
  C1.4: Click debounce    ✅ 150ms debounce in hooks.ts
  C1.3: Screenshot dedup  ✅ SHA-256 hash comparison in hooks.ts
  C1.5: Extra metadata    ✅ screenWidth/Height/scaleFactor/activeWindowBounds on every event
  C1.1: Persistent stream ✅ Cache-based optimization (100ms TTL) in capture.ts
  C1.6: Clipboard capture ✅ 1s polling in hooks.ts, new "clipboard" event type

C2 (accessibility tree)  ✅ DONE
  Windows PowerShell      ✅ FromPoint() via UI Automation (PresentationCore assembly)
  macOS Swift helper      ✅ AXUIElementCopyElementAtPosition, auto-compiles on first use
  Wire into CapturedEvent ✅ elementUnderCursor on click events
  Two-stage understand    ✅ labelEvents() from metadata, LLM only for workflow synthesis
                            — text-only model when all events have a11y
                            — vision model only for events missing a11y (sends only those screenshots)

Bug fixes done:
  ✅ Overlay stop now saves events to DB (was losing all events on pill stop)
  ✅ appName/windowTitle attached to ALL events (was only on windowSwitch)

⚠️  NEEDS TESTING: Rebuild electron (tsc -p tsconfig.electron.json) and re-test e2e
  — Verify appName shows correctly on all events (not "unknown app")
  — Verify event count is correct after overlay stop
  — Test "Understand" button produces good results with a11y data

C3 (Screenpipe sidecar)  — NOT STARTED
  Decide: bundle binary vs require install
  Spawn sidecar on app launch
  Query API for continuous data
  Build pattern detection pipe
  UI for "suggested automations" from patterns
```

---

## Files to modify

| File | Changes |
|------|---------|
| `electron/recorder/capture.ts` | JPEG output, persistent stream or caching |
| `electron/recorder/hooks.ts` | Click debounce, clipboard capture, metadata, dedup |
| `electron/recorder/types.ts` | Extended CapturedEvent with new fields |
| `electron/recorder/accessibility.ts` | **NEW** — platform-specific a11y capture |
| `electron/recorder/screenpipe.ts` | **NEW** (Phase C3) — sidecar management + SDK integration |
| `app/api/recordings/[id]/understand/route.ts` | Use a11y data in LLM prompt |

---

## Key Decisions (resolved)

1. **Persistent stream vs cached getSources()** — Went with cache-based (100ms TTL). Simple, effective.

2. **Accessibility tree: PowerShell vs native addon** — PowerShell on Windows, Swift helper on macOS. Cross-platform behind `getElementAtPoint()` interface. ~100ms latency is fine since clicks are debounced at 150ms.

3. **Two-stage understand pipeline** — Stage 1 labels events from a11y metadata (no LLM). Stage 2 is a single LLM call for workflow synthesis. Uses cheap text-only model when all events have a11y data, vision model only for events missing a11y. Massive cost reduction vs sending all screenshots.

## Key Decisions (still open)

4. **Screenpipe: bundle vs require install** — Bundling adds ~50-100MB to the app. Requiring install is simpler but worse UX. Could do "install on first use" with a download prompt.

5. **Screenshots: temp files vs DB** — Currently saved as temp files. For the understanding API, we read them back as base64. Could store as base64 blobs in the DB directly (simpler) or upload to S3 (scalable). For now, temp files work for session recording.

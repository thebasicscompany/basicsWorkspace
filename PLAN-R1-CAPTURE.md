# Phase R1: Capture MVP — Implementation Plan

> Record button → captures screenshots on meaningful events → saves to disk + DB.

---

## Stack Decisions (from research)

| Capability | Solution | Why |
|---|---|---|
| Screenshot capture | Electron `desktopCapturer` (main process, IPC) | Built-in, no deps needed |
| Global input monitoring | `uiohook-napi` v1.5.5 | Only actively maintained package with mouse+keyboard. N-API prebuilds = no rebuild per Electron version |
| Active window detection | `@pam/active-window` or `active-win` v8 (CJS) | Cross-platform window title + app name + URL |
| System tray indicator | Electron `Tray` API | Built-in, swap icon between idle/recording PNGs |
| macOS screen permission | `systemPreferences.getMediaAccessStatus('screen')` | Can't auto-prompt — must guide user to System Settings |

**Not using:** nut.js (automation-only, paid monitoring plugin), iohook (dead since 2021), node-global-key-listener (keyboard-only).

---

## What Gets Built

### 1. Dependencies to install

```bash
npm install uiohook-napi active-win@8
```

### 2. Electron main process — recorder module

```
electron/
├── recorder/
│   ├── capture.ts       — screenshot via desktopCapturer, save PNG to temp dir
│   ├── hooks.ts         — uiohook-napi: listen for click, keydown, wheel, window switch
│   ├── buffer.ts        — event buffer: collect CapturedEvents, flush to disk/API
│   └── indicator.ts     — Tray icon management (idle ↔ recording states)
```

**capture.ts** — Screen capture helper
- `captureScreen(): Promise<Buffer>` — calls `desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })`, returns first source thumbnail as PNG buffer
- Saves to temp dir: `{tempDir}/recordings/{sessionId}/{timestamp}.png`

**hooks.ts** — Global input listener
- Uses `uIOhook.on('click', ...)` for mouse clicks → triggers screenshot + records coordinates
- Uses `uIOhook.on('keydown', ...)` for keyboard → buffers keystrokes, triggers screenshot after 500ms pause
- Uses `uIOhook.on('wheel', ...)` for scroll → debounce 300ms, then screenshot
- Detects window/tab switch via polling `active-win` every 500ms — if title/app changes, trigger screenshot
- All events produce a `CapturedEvent` pushed to the buffer

**buffer.ts** — Event accumulator
- Holds `CapturedEvent[]` in memory during a recording session
- Each event's screenshot path points to the temp dir file
- On recording stop: flush all events to the API (`POST /api/recordings/{id}` with events payload)
- Cleanup: delete temp screenshots after successful upload

**indicator.ts** — System tray
- Two 16×16 PNG icons: `tray-idle.png`, `tray-recording.png` (red dot)
- Context menu: "Start Recording" / "Stop Recording" / "Open Basics"
- `setRecording(active: boolean)` swaps icon + tooltip

### 3. IPC bridge additions

In `electron/preload.ts`, expose:
```ts
contextBridge.exposeInMainWorld('recorder', {
  startRecording: () => ipcRenderer.invoke('recorder:start'),
  stopRecording: () => ipcRenderer.invoke('recorder:stop'),
  getStatus: () => ipcRenderer.invoke('recorder:status'),
  onEvent: (cb: (event: CapturedEvent) => void) => {
    ipcRenderer.on('recorder:event', (_e, event) => cb(event))
  },
  removeEventListeners: () => {
    ipcRenderer.removeAllListeners('recorder:event')
  },
})
```

In `electron/main.ts`, register IPC handlers:
- `recorder:start` — create recording via API, init buffer, start hooks + capture
- `recorder:stop` — stop hooks, flush buffer to API, update recording status
- `recorder:status` — return { recording: boolean, eventCount: number, sessionId: string }
- On each captured event, send to renderer: `mainWindow.webContents.send('recorder:event', event)`

### 4. CapturedEvent shape

```ts
interface CapturedEvent {
  timestamp: number
  type: 'click' | 'keyInput' | 'windowSwitch' | 'navigation' | 'scroll'
  screenshotPath: string        // path to PNG in temp dir
  coordinates?: { x: number; y: number }
  textEntered?: string
  windowTitle?: string
  appName?: string
  url?: string
}
```

### 5. Renderer UI additions

**apps/recorder/components/record-button.tsx**
- Big "Start Recording" button (only shown when `isElectron`)
- During recording: shows stop button + event counter + elapsed time
- Calls `window.recorder.startRecording()` / `stopRecording()`

**apps/recorder/components/recording-overlay.tsx**
- Floating pill in bottom-right during recording: "Recording • 12 events • 2:34"
- Stop button
- Visible on all pages while recording is active (rendered in layout)

**Update apps/recorder/components/recording-list.tsx**
- Show recordings with status badges
- Click a recording → view its events (future: action timeline)

**Update app/api/recordings/[id]/route.ts**
- Add PATCH to update recording with events, status, duration, eventCount

### 6. macOS permission flow

On first "Start Recording" attempt:
1. Check `systemPreferences.getMediaAccessStatus('screen')`
2. If not `'granted'`, send IPC message to renderer to show permission dialog
3. Dialog explains what's needed + button to open System Settings
4. After user grants permission and restarts app, recording works

---

## Implementation Order

1. **Install deps** (`uiohook-napi`, `active-win@8`)
2. **capture.ts** — screenshot helper, temp dir management
3. **hooks.ts** — uiohook-napi setup, event detection logic
4. **buffer.ts** — event accumulation
5. **indicator.ts** — tray icon
6. **IPC handlers** in main.ts + preload.ts bridge
7. **PATCH /api/recordings/[id]** — update recording with events
8. **record-button.tsx** — start/stop UI
9. **recording-overlay.tsx** — floating recording indicator
10. **Permission flow** for macOS
11. **Test end-to-end** — start recording, click around, stop, verify events saved

---

## What This Phase Does NOT Include

- Understanding/vision (Phase R2)
- Workflow generation (Phase R3)
- Keyboard text field detection (Phase R4)
- Accessibility tree capture (Phase R4)
- Local OmniParser (Phase R4)
- Browser URL detection (needs OS-specific hooks, deferred to R4)

# Implementation Plan: Electron + Recorder App

> From current state (Next.js web app) → Electron desktop app → Recorder app with video-to-automation.

---

## Phase Overview

```
Phase E1: Electron Shell             ← run the app in Electron (dev mode)
Phase E2: Electron Packaging         ← build distributable .exe / .dmg
Phase R1: Recorder App (scaffold)    ← launchpad app, DB schema, UI shell
Phase R2: Input Capture              ← global hooks, screenshots, event buffer
Phase R3: Understanding Pipeline     ← LLM processes events into structured actions
Phase R4: Workflow Generation        ← structured actions → canvas blocks
Phase R5: Polish & Review UX         ← timeline review, editing, re-generation
Phase E3: Native Features            ← tray, menus, deep links, auto-update
```

Phases E1 → E2 → R1 are sequential (each depends on the previous).
R2, R3, R4 are sequential (capture → understand → generate).
E3 is parallel with R-phases.

---

## Phase E1: Electron Shell (Dev Mode)

**Goal:** `npm run electron:dev` opens the existing app in an Electron window.

### Steps

1. **Install Electron dependencies**

```bash
npm install --save-dev electron electron-builder get-port-please concurrently wait-on
npm install electron-store
```

2. **Create `tsconfig.electron.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "electron/dist",
    "rootDir": "electron",
    "esModuleInterop": true
  },
  "include": ["electron/**/*.ts"],
  "exclude": ["node_modules"]
}
```

3. **Create `electron/main.ts`**

Per ELECTRON-PLAN.md Phase 1B:
- `app.whenReady()` → create BrowserWindow (1280×800, hiddenInset title bar)
- Dev mode: `win.loadURL('http://localhost:3000')`
- Prod mode: spawn standalone server on random port via `get-port-please`
- Preload script with `contextIsolation: true`

4. **Create `electron/preload.ts`**

Minimal bridge — expose app version, platform info, and `isElectron: true` flag.

```ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: ipcRenderer.invoke('app:version'),
})
```

5. **Create `electron/utils/server.ts`**

Per ELECTRON-PLAN.md Phase 1C — server lifecycle management for production mode.

6. **Create `electron/splash.html`**

Simple loading page with Basics logo on `#F9F7F4` background.

7. **Add scripts to `package.json`**

```json
{
  "main": "electron/dist/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && tsc -p tsconfig.electron.json && electron .\"",
    "electron:build": "next build && tsc -p tsconfig.electron.json && electron-builder",
    "electron:start": "tsc -p tsconfig.electron.json && electron ."
  }
}
```

8. **Add Electron detection helper**

```ts
// lib/electron.ts
export const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron
```

### Deliverable

`npm run electron:dev` → Basics Workspace opens in a desktop window. Everything works (auth, CRM, automations, canvas).

---

## Phase E2: Electron Packaging

**Goal:** Build distributable installers.

### Steps

1. **Create `electron-builder.yml`** — per ELECTRON-PLAN.md Phase 2A
2. **Create app icons** — `electron/resources/icon.{ico,icns,png}`
3. **Build pipeline script** — `next build` → copy static → `tsc` → `electron-builder`
4. **Environment variable handling** — `BETTER_AUTH_URL` set dynamically to `http://127.0.0.1:{port}`

### Deliverable

`npm run electron:build` → produces `.exe` (Windows) and `.dmg` (Mac).

---

## Phase R1: Recorder App Scaffold

**Goal:** "Recorder" app appears on the launchpad. Empty shell with DB schema.

### Steps

1. **Create app manifest**

```ts
// apps/recorder/manifest.ts
import { VideoCamera } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const recorderApp = {
  slug: "recorder",
  name: "Recorder",
  href: "/recorder",
  icon: VideoCamera,
  iconColor: "text-white",
  iconBg: "bg-rose-500",
  iconWeight: "fill",
  order: 2,
} satisfies AppManifest
```

2. **Register in `apps/_registry.ts`**

```ts
import { recorderApp } from "./recorder/manifest"
// Add to INSTALLED_APPS array
```

3. **Create route pages**

```
app/(workspace)/recorder/page.tsx       ← recording list
app/(workspace)/recorder/[id]/page.tsx  ← single recording review
```

4. **Create DB schema**

```ts
// lib/db/schema/recordings.ts
import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const recordings = pgTable('recordings', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orgId: text('org_id').notNull(),
  userId: text('user_id').notNull(),
  name: text('name'),
  status: text('status', {
    enum: ['recording', 'recorded', 'processing', 'converted', 'failed']
  }).notNull().default('recording'),
  events: jsonb('events').$type<RecordedEvent[]>().notNull().default([]),
  structuredActions: jsonb('structured_actions').$type<StructuredAction[]>(),
  workflowId: text('workflow_id'),
  duration: integer('duration'),
  eventCount: integer('event_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

5. **Run migration**

```bash
npx drizzle-kit push
```

6. **Create scaffold components**

```
apps/recorder/components/
├── recording-list.tsx       ← Table of past recordings (empty state for now)
└── recording-status.tsx     ← Status badges (recorded, processing, converted)
```

7. **Create API routes**

```
app/api/recordings/route.ts          ← GET (list), POST (create)
app/api/recordings/[id]/route.ts     ← GET, DELETE
```

8. **Electron gating** — on web, show "Available on desktop app" empty state using `isElectron` check.

### Deliverable

Recorder tile on launchpad. Clicking it opens the app shell. On web it shows a download prompt. On Electron it shows the (empty) recording list.

---

## Phase R2: Input Capture

**Goal:** Press Record → global input hooks capture clicks, keystrokes, window switches + sparse screenshots → press Stop → events saved to DB.

### Steps

1. **Install capture dependencies**

```bash
npm install uiohook-napi @aspect-build/active-win
npm install --save-dev @types/node
```

Note: if `@aspect-build/active-win` doesn't work, fall back to `@aspect-build/active-win` or `get-windows` (Sindre Sorhus). Test which one resolves the active window correctly on Windows and macOS.

2. **Create `electron/recorder/capture.ts`**

```ts
import { uIOhook, UiohookMouseEvent, UiohookKeyboardEvent } from 'uiohook-napi'

// Start/stop global hooks
// On mousedown → emit click event + trigger screenshot
// On keydown → buffer into text string
// On 1500ms keystroke pause → flush text buffer as 'text' event
// On active window change → emit 'windowSwitch' event + trigger screenshot
```

3. **Create `electron/recorder/screenshot.ts`**

```ts
import { desktopCapturer } from 'electron'

// getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
// Convert to JPEG quality 80
// Save to temp dir: app.getPath('temp') + '/basics-recordings/{sessionId}/'
// Return file path
```

4. **Create `electron/recorder/active-window.ts`**

```ts
// Poll every 500ms during recording
// Compare with last known window
// If changed → emit windowSwitch event
```

5. **Create `electron/recorder/buffer.ts`**

```ts
// Accumulates RecordedEvent[]
// Manages keystroke → text aggregation (1500ms debounce)
// Triggers screenshot on click/windowSwitch events
// On stop: returns full event array
// Saves screenshots to temp dir, stores file paths in events
```

6. **Add IPC handlers in `electron/main.ts`**

```ts
ipcMain.handle('recorder:start', async () => { /* start hooks + buffer */ })
ipcMain.handle('recorder:stop', async () => { /* stop hooks, return events */ })
ipcMain.handle('recorder:status', () => { /* 'idle' | 'recording' */ })
ipcMain.handle('recorder:available', () => true)
```

7. **Expand preload bridge**

```ts
contextBridge.exposeInMainWorld('recorder', {
  startRecording: () => ipcRenderer.invoke('recorder:start'),
  stopRecording: () => ipcRenderer.invoke('recorder:stop'),
  getStatus: () => ipcRenderer.invoke('recorder:status'),
  isAvailable: () => ipcRenderer.invoke('recorder:available'),
  onEvent: (cb) => ipcRenderer.on('recorder:event', (_, e) => cb(e)),
})
```

8. **Create `apps/recorder/hooks/use-recorder.ts`**

```ts
// Wraps window.recorder IPC bridge
// Returns { startRecording, stopRecording, status, events, isAvailable }
// Falls back to isAvailable: false on web
```

9. **Create recording UI**

```
apps/recorder/components/
├── record-button.tsx         ← Big red Record button on the main page
├── recording-overlay.tsx     ← Floating mini-overlay during recording (stop button + timer + event count)
└── recording-controls.tsx    ← Start/stop/pause controls
```

10. **Wire the flow**

- User clicks Record → calls `window.recorder.startRecording()`
- UI switches to floating overlay (small, stays on top while user works in other apps)
- Events stream in via `onEvent` callback → counter increments
- User clicks Stop → calls `stopRecording()` → events returned
- POST events to `/api/recordings` → saved to DB
- Redirect to `/recorder/{id}` review page

11. **macOS permissions** — on first Record click, check permissions via `node-mac-permissions`. If not granted, show a dialog explaining what's needed and link to System Preferences.

### Deliverable

User clicks Record → works in Gmail, Slack, etc. → clicks Stop → sees a list of captured events with timestamps, window names, click coordinates, typed text, and screenshots. Raw data, no AI processing yet.

---

## Phase R3: Understanding Pipeline

**Goal:** Send captured events to LLM → get back structured action descriptions.

### Steps

1. **Create `apps/recorder/lib/process-recording.ts`**

```ts
// Takes RecordedEvent[]
// For each click event with a screenshot:
//   - Encode screenshot as base64
//   - Send to gateway with prompt: "User clicked at (x,y) on this screen. 
//     Active window: {title}. What element was clicked? What action was performed?"
//   - Parse response: { element, action, app, details }
// For text events:
//   - Send with context of previous action
//   - Parse: { field, intent, value }
// Returns StructuredAction[]
```

2. **Create `app/api/recordings/[id]/process/route.ts`**

```ts
// POST handler
// Loads recording from DB
// Calls process-recording with events
// Saves structuredActions to recording row
// Updates status to 'processing' → 'converted' (or 'failed')
// Uses SSE to stream progress back to UI
```

3. **Define StructuredAction type**

```ts
interface StructuredAction {
  index: number
  action: string          // "send_email", "post_message", "create_record", etc.
  app: string             // "Gmail", "Slack", "Basics CRM", etc.
  element?: string        // "Send button", "Subject field", "#general channel"
  details: Record<string, any>  // { to: "john@...", subject: "...", body: "..." }
  confidence: number      // 0-1, how sure the LLM is
  screenshotPath?: string // reference to the click screenshot
}
```

4. **Create review UI**

```
apps/recorder/components/
├── action-timeline.tsx      ← Vertical timeline of structured actions
├── action-step.tsx          ← Single step: screenshot thumbnail + action label + confidence
└── action-editor.tsx        ← Inline editing (correct action label, add context)
```

5. **Wire the flow**

- After recording saved, show "Process Recording" button
- Clicking it → POST to `/api/recordings/{id}/process`
- Stream progress (processing event 1 of 7...)
- When done, render action timeline
- User can edit/remove/reorder steps

### Deliverable

User records a workflow → clicks Process → sees a labeled timeline: "1. Opened Gmail compose, 2. Typed subject: 'Meeting notes', 3. Clicked Send, 4. Switched to Slack, 5. Posted message to #general". Each step has the screenshot and a confidence score.

---

## Phase R4: Workflow Generation

**Goal:** Structured actions → executable automation on the canvas.

### Steps

1. **Create `apps/recorder/lib/generate-workflow.ts`**

```ts
// Takes StructuredAction[]
// Maps each action to a block type from the registry:
//   "send_email" (Gmail) → gmail block
//   "post_message" (Slack) → slack-send-message block
//   "create_record" (Basics CRM) → API block targeting /api/records
//   unknown action → Agent block with instruction
// Generates block positions (vertical layout, 200px spacing)
// Generates edges (sequential: block1 → block2 → block3)
// Fills in subblock values from action details
// Returns { blocks, edges } matching POST /api/workflows shape
```

2. **Create block mapping registry**

```ts
// apps/recorder/lib/block-mappings.ts
// Maps app+action combinations to block types:
const MAPPINGS: Record<string, { blockType: string, subblockDefaults: Record<string, any> }> = {
  'gmail.send_email': { blockType: 'gmail', subblockDefaults: { action: 'send' } },
  'slack.post_message': { blockType: 'slack', subblockDefaults: { action: 'send_message' } },
  'slack.read_channel': { blockType: 'slack', subblockDefaults: { action: 'list_messages' } },
  // ... extend as we test more workflows
}

// Fallback: send to LLM with full block registry for unmapped actions
```

3. **Create `app/api/recordings/[id]/generate/route.ts`**

```ts
// POST handler
// Loads recording + structuredActions from DB
// Calls generate-workflow
// POSTs to /api/workflows to create the workflow
// Updates recording with workflowId
// Returns { workflowId, workflowUrl }
```

4. **Add "Generate Automation" button to review UI**

```
apps/recorder/components/
└── generate-button.tsx    ← "Generate Automation" CTA
                             Shows spinner during generation
                             On success: "View on Canvas" link → /automations/{workflowId}
```

5. **Wire the full flow**

- After processing, user sees action timeline
- User clicks "Generate Automation"
- POST to `/api/recordings/{id}/generate`
- Workflow created in DB
- User redirected to `/automations/{workflowId}` → canvas shows the generated workflow
- User tweaks blocks, tests with Run, deploys

### Deliverable

Full end-to-end: Record → Process → Generate → opens on canvas with correct blocks and connections. User can run it immediately.

---

## Phase R5: Polish & Review UX

**Goal:** Make the review/editing experience smooth. Add re-generation and refinement.

### Steps

1. **Floating recording widget** — small always-on-top overlay during recording (not a full window). Shows: red dot, elapsed time, event count, Stop button. Minimally intrusive.

2. **Recording indicator in system tray** — red dot on tray icon during recording. Right-click → Stop Recording.

3. **Action editing in timeline** — click any step to edit the action label, change the mapped block type, add notes for the LLM.

4. **Re-process with corrections** — if the LLM got a step wrong, user corrects it, clicks "Re-generate" → only regenerates from the corrected step forward.

5. **Variable detection** — LLM identifies values that should be variables (specific email addresses, channel names, etc.) and suggests parameterization. User confirms which values to generalize.

6. **Recording naming** — auto-name recordings based on the detected workflow ("Gmail → Slack notification") with option to rename.

7. **Keyboard shortcuts** — global shortcut to start/stop recording (e.g., Ctrl+Shift+R / Cmd+Shift+R).

8. **Recording deletion** — delete recording + associated temp screenshots.

---

## Phase E3: Native Features (Parallel)

Can be done alongside R-phases.

1. **System tray** — minimize to tray, recording indicator, quick actions
2. **Window management** — remember size/position via `electron-store`
3. **Single instance lock** — `app.requestSingleInstanceLock()`
4. **Native menus** — proper Mac app menu (About, Preferences, Quit), Edit menu for undo/redo/cut/copy/paste
5. **Deep links** — `basics://` protocol for OAuth callbacks
6. **Auto-update** — `electron-updater` + GitHub Releases

---

## Dependency Graph

```
E1 (Shell)
 │
 ├──► E2 (Packaging) ──► E3 (Native Features)
 │
 └──► R1 (App Scaffold)
       │
       └──► R2 (Input Capture)
             │
             └──► R3 (Understanding)
                   │
                   └──► R4 (Generation)
                         │
                         └──► R5 (Polish)
```

### What already exists (no work needed)

| Dependency | Status |
|-----------|--------|
| Block registry (180+ blocks) | Done |
| Workflow CRUD API | Done |
| Canvas rendering | Done |
| Gateway for LLM calls | Done |
| Auth + org scoping | Done |
| `logContextEvent()` | Done |
| Drizzle + Postgres | Done |

### What must be installed

| Package | Phase | Purpose |
|---------|-------|---------|
| `electron` | E1 | Desktop shell |
| `electron-builder` | E1 | Packaging |
| `get-port-please` | E1 | Random port for standalone server |
| `concurrently` | E1 | Run Next.js + Electron in parallel |
| `wait-on` | E1 | Wait for dev server before launching Electron |
| `electron-store` | E1 | Persist window state, settings |
| `uiohook-napi` | R2 | Global keyboard + mouse hooks |
| `@paymoapp/active-window` | R2 | Detect focused window + app name |
| `node-mac-permissions` | R2 | macOS Accessibility + Screen Recording permission checks |

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| uiohook-napi doesn't build for our Electron version | N-API should make this a non-issue. Fallback: `selection-hook` v2.0.1 |
| macOS permissions confuse users | First-run dialog explaining why + link to System Preferences. Include in onboarding flow. |
| LLM misidentifies UI elements | Confidence scores on each step. User can correct in review UI. Re-generation from corrected steps. |
| Screenshots leak sensitive data to cloud | Screenshots only sent to user's own gateway. Never stored on our servers. Option for local-only processing in future (OmniParser). |
| Antivirus flags global hooks on Windows | Code-sign the app. Consider whitelisting guidance in docs. |
| Wayland (Linux) blocks global hooks | Show warning on Wayland. Suggest X11 fallback. Low priority — most users are Windows/Mac. |
| Cost of vision API calls per recording | Event-driven capture keeps it to ~20 screenshots. $0.30-0.50/session is acceptable. Show cost estimate before processing. |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Record → Process → Generate latency | < 30 seconds for a 20-step workflow |
| Action identification accuracy | > 85% of steps correctly labeled |
| Block mapping accuracy | > 70% of steps map to correct block type |
| Generated workflow runs successfully | > 50% on first try (user can fix the rest) |
| Cost per recording session | < $0.50 |

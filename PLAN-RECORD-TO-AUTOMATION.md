# Record-to-Automation: Architecture Plan

> Turn screen recordings of user workflows into executable automations on the Basics canvas.

---

## The Idea

User hits "Record" in the Electron app → walks through their workflow (browser, desktop apps, Basics workspace) → the agent watches, captures meaningful moments, understands what happened → proposes an automation on the canvas → user reviews, tweaks, deploys.

This is the core differentiator. Everything below is how to build it.

---

## Open-Source Landscape (What Already Exists)

### Direct Foundations (TypeScript, Electron-compatible, permissive license)

| Project | Stars | What it does | License | Use for |
|---------|-------|-------------|---------|---------|
| [UI-TARS Desktop](https://github.com/bytedance/UI-TARS-desktop) | 29k | Electron app using vision-language model to control desktop. nut.js for input, Playwright for browser. Full screenshot→analyze→act loop. | Apache-2.0 | **Primary reference architecture.** Same stack (Electron + TS + nut.js). Already has the capture and vision inference pipeline. |
| [Screenpipe](https://github.com/screenpipe/screenpipe) | 18k | Continuous screen + audio capture with event-driven snapshots (captures only on meaningful changes, not every frame). Local Whisper STT. MCP server. | MIT | **Recording strategy.** Event-driven capture approach is exactly right — don't record video, capture screenshots + accessibility tree at meaningful moments. |
| [Midscene.js](https://github.com/web-infra-dev/midscene) | 12k | Vision-driven UI automation for web/mobile/desktop. Uses VLMs (UI-TARS, Gemini, Qwen) to understand screenshots. | MIT | **Perception layer.** TypeScript, integrates with Playwright/Puppeteer. Handles "what's on this screen" parsing. |
| [nut.js](https://github.com/nut-tree/nut.js) | 2.8k | Native desktop automation for Node.js — mouse, keyboard, screen capture, image search. | Free non-commercial | **Execution layer.** Already used by UI-TARS Desktop. For replaying recorded actions. |

### Understanding Layer (Python, call as service)

| Project | Stars | What it does | License | Use for |
|---------|-------|-------------|---------|---------|
| [OmniParser](https://github.com/microsoft/OmniParser) | 25k | Parses UI screenshots into structured elements — detects buttons, inputs, links with semantic labels. SOTA on ScreenSpot Pro. | CC-BY-4.0 | **Screenshot → structured UI elements.** Run as a sidecar service. Maps click coordinates to "clicked the Submit button." |
| [UI-TARS Model](https://github.com/bytedance/UI-TARS) | 10k | Vision-language model that understands screenshots and outputs structured actions. 42.5% on OSWorld (beats Claude at 28%). | Apache-2.0 | **Action understanding.** Best open model for "what is the user doing in this screenshot." |
| [OpenAdapt](https://github.com/OpenAdaptAI/OpenAdapt) | 1.5k | Records GUI demonstrations (screenshots + input + accessibility tree), uses LLMs to learn and replay. Demonstrate → Learn → Execute pipeline. | MIT | **Conceptual reference.** The closest thing to the full vision. Python-only but the pipeline design is the blueprint. |

### Not recommended (for reference)

| Project | Why not |
|---------|---------|
| Browser Use (85k stars) | Python-only, browser-only, executes from instructions not recordings |
| Skyvern (21k stars) | AGPL license, browser-only |
| LaVague (6k stars) | Python-only, instruction-based not recording-based |
| TagUI (6k stars) | Old-school RPA, no AI understanding |

---

## Architecture

Three phases, layered on top of the existing Electron plan.

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                  │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Next.js  │  │  Recorder    │  │  Vision Service   │  │
│  │ Server   │  │  (capture)   │  │  (understanding)  │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
│        │              │                    │              │
│        │              ▼                    │              │
│        │     ┌────────────────┐            │              │
│        │     │ Action Buffer  │────────────┘              │
│        │     │ (events +      │                           │
│        │     │  screenshots)  │                           │
│        │     └───────┬────────┘                           │
│        │             │                                    │
│        │             ▼                                    │
│        │     ┌────────────────┐                           │
│        │     │ Workflow       │                           │
│        │     │ Generator      │──────► Canvas blocks      │
│        │     └────────────────┘                           │
│        │                                                  │
└────────┼──────────────────────────────────────────────────┘
         │
         ▼
    BrowserWindow (renderer)
```

### Layer 1: Recorder (Electron-native)

Captures what the user is doing. Does NOT record continuous video — uses Screenpipe's event-driven approach.

**Captures on meaningful events:**
- Mouse click → screenshot + click coordinates + timestamp
- Keyboard input pause (>500ms) → screenshot + text entered
- Window/tab switch → screenshot of new window
- Scroll stop → screenshot of new viewport
- URL navigation → screenshot + URL

**What gets captured per event:**
```ts
interface CapturedEvent {
  timestamp: number
  type: 'click' | 'keyInput' | 'windowSwitch' | 'navigation' | 'scroll'
  screenshot: Buffer           // PNG of full screen at moment of event
  coordinates?: { x: number, y: number }  // for clicks
  textEntered?: string         // for keyboard input
  windowTitle?: string         // active window name
  url?: string                 // for browser navigation
  accessibilityTree?: object   // OS accessibility snapshot (when available)
}
```

**Implementation using Electron APIs:**
- `desktopCapturer.getSources()` for screen capture
- `globalShortcut` for record start/stop toggle
- OS-level input hooks via nut.js or native addons for mouse/keyboard events
- `BrowserWindow.getFocusedWindow()` for active window tracking

**Key design decisions:**
- Screenshots are stored in a temp directory, not memory (recordings can be long)
- Events are buffered and batched — sent to the understanding layer every N events or on recording stop
- Recording indicator in system tray (red dot) so user knows it's active
- Privacy: only captures during active recording session, user controls start/stop

### Layer 2: Understanding (Vision + LLM)

Converts raw captured events into semantic action descriptions.

**Pipeline per captured event:**
1. Screenshot → OmniParser → structured UI element map (buttons, inputs, labels with bounding boxes)
2. Click coordinates + element map → identify which element was interacted with
3. Sequence of identified actions → LLM summarizes into high-level steps

**Example transformation:**
```
Raw events:
  1. click (x:450, y:320) + screenshot of Gmail
  2. keyInput "Meeting notes from today's standup" + screenshot of compose window
  3. click (x:890, y:150) + screenshot showing Send button

Understanding output:
  1. { action: "open_compose", app: "Gmail" }
  2. { action: "type_subject", value: "Meeting notes from today's standup" }
  3. { action: "send_email", app: "Gmail" }

High-level summary:
  "Send an email via Gmail with subject from context"
```

**Where this runs:**
- **Option A (recommended to start):** Cloud API call. Send screenshots + events to Claude/GPT-4V with a structured prompt. Fast to build, good accuracy, costs money per recording.
- **Option B (later):** Local UI-TARS model via Ollama or similar. Free, private, slower, requires GPU.
- **Option C (hybrid):** OmniParser runs locally for element detection (lightweight), LLM call only for high-level summarization.

### Layer 3: Workflow Generator

Converts understood action sequences into Basics canvas blocks.

**Mapping rules:**
```
Understood action              →  Canvas block
─────────────────────────────────────────────────
"Send email via Gmail"         →  Gmail Send block
"Make API call to {url}"       →  API block (method, url, body)
"Search Slack for {query}"     →  Slack Search block
"Update CRM contact"           →  internal API block → /api/records
"If {condition}"               →  Condition block
"Wait for response"            →  Delay block
"Run this code"                →  Function block
"Ask LLM to summarize"         →  Agent block
Unknown/complex action         →  Agent block with instruction
```

**The LLM prompt for workflow generation:**
```
Given these observed user actions:
{action_sequence}

And these available automation blocks:
{block_registry_summary}

Generate a workflow as a JSON array of blocks with connections.
Map each action to the most appropriate block type.
For actions that don't map to a specific block, use an Agent block with clear instructions.
Generalize specific values into variables where appropriate
(e.g., a specific email address → {{recipient}}).
```

**Output format:** The generator produces the same JSON shape that `POST /api/workflows` accepts — blocks + edges + subblock values. The canvas renders it immediately.

---

## Integration with Electron Plan

This slots into the existing Electron plan as a new Phase 7, after the base shell is working.

### New files in `electron/`:

```
electron/
├── main.ts                    ← existing (add recorder IPC handlers)
├── preload.ts                 ← existing (add recorder bridge)
├── recorder/
│   ├── capture.ts             ← Screen capture + input event hooks
│   ├── buffer.ts              ← Event buffer + temp file management
│   ├── hooks.ts               ← OS-level input listeners (nut.js)
│   └── indicator.ts           ← System tray recording indicator
├── understanding/
│   ├── pipeline.ts            ← Orchestrates capture → understanding → generation
│   ├── vision.ts              ← Screenshot → structured elements (OmniParser or API)
│   └── summarizer.ts          ← Action sequence → high-level steps (LLM call)
├── generator/
│   ├── workflow-mapper.ts     ← Maps understood actions → block types
│   ├── block-templates.ts     ← Templates for each block type's subblock values
│   └── canvas-output.ts       ← Produces workflow JSON for the canvas API
└── utils/
    └── server.ts              ← existing
```

### New UI in the workspace:

```
apps/automations/components/
├── record-button.tsx          ← "Record" button on canvas toolbar
├── recording-overlay.tsx      ← Floating overlay during recording
├── review-panel.tsx           ← Shows proposed automation for user review
└── action-timeline.tsx        ← Visual timeline of captured actions
```

### IPC Bridge (preload additions):

```ts
// In preload.ts — exposed to renderer
contextBridge.exposeInMainWorld('recorder', {
  startRecording: () => ipcRenderer.invoke('recorder:start'),
  stopRecording: () => ipcRenderer.invoke('recorder:stop'),
  getRecordingStatus: () => ipcRenderer.invoke('recorder:status'),
  onActionCaptured: (cb) => ipcRenderer.on('recorder:action', cb),
  onWorkflowGenerated: (cb) => ipcRenderer.on('recorder:workflow', cb),
})
```

---

## Implementation Phases

### Phase R1: Capture MVP ✅ DONE

**Goal:** Record button → captures screenshots on clicks → saves to disk.

- ✅ `electron/recorder/capture.ts` using `desktopCapturer`
- ✅ Hook mouse clicks, keyboard, scroll via `uiohook-napi` (replaced nut.js — nut.js monitoring is paid-only)
- ✅ Active window detection via `active-win@8` polling
- ✅ Buffer events with screenshots to temp directory
- ✅ IPC bridge: `recorder:start`, `recorder:stop`, `recorder:status`, `recorder:event` (live streaming)
- ✅ Record button on recorder page (only visible in Electron, hidden on web)
- ✅ Recording overlay (floating pill on all workspace pages during recording)
- ✅ Recording indicator in system tray (gray idle / red recording)
- ✅ Zustand store for renderer-side recording state
- ✅ PATCH API to save events back to recordings table
- ✅ Electron main process restructured into modular architecture (window.ts, ipc.ts, recorder/)

**No understanding yet** — capture pipeline is built.

### Phase R2: Understanding MVP (1-2 weeks)

**Goal:** Captured events → semantic action descriptions via LLM.

- Send screenshots + click coordinates to Claude API (or gateway) with structured prompt
- Prompt includes: "Here is a screenshot. The user clicked at (x, y). What UI element did they interact with? What action did they perform?"
- Batch process all events from a recording session
- Return structured action sequence to renderer
- Show action timeline in a review panel

**No workflow generation yet** — just prove the understanding works.

### Phase R3: Workflow Generation (1-2 weeks)

**Goal:** Understood actions → canvas blocks.

- Map action types to block registry entries
- Generate workflow JSON (blocks + edges + subblock values)
- POST to `/api/workflows` to create the workflow
- Open it on the canvas automatically
- User reviews, tweaks connections/values, saves

### Phase R4: Polish & Feedback Loop (ongoing)

- Keyboard input capture + text field detection
- "Is this right?" confirmation at each step during recording
- Agent asks clarifying questions: "Should this email always go to john@, or should it be a variable?"
- Generalization: replace specific values with variables/inputs
- Accessibility tree capture for better element identification (platform-specific)
- Local OmniParser for faster/cheaper element detection

---

## What to Borrow vs Build

| Component | Borrow from | Build ourselves | Why |
|-----------|-------------|-----------------|-----|
| Screen capture in Electron | Electron `desktopCapturer` API | Just the wrapper | Native API is sufficient |
| Input event hooks | nut.js (used by UI-TARS Desktop) | Event filtering + buffering | nut.js handles cross-platform input |
| Event-driven capture strategy | Screenpipe's approach | Our implementation | Concept is right, their impl is Rust |
| UI element detection | OmniParser (as service) or Claude vision | Integration code | Don't train our own vision model |
| Action summarization | Claude/GPT-4V API | Prompt engineering | LLM call with good prompts |
| Workflow generation | — | Full implementation | This is our block format, nobody else has it |
| Recording UI | — | Full implementation | Needs to integrate with our canvas |
| Review/approval UX | — | Full implementation | Core product differentiator |

**Bottom line:** The capture layer is largely off-the-shelf (Electron APIs + nut.js). The understanding layer is API calls to vision models with good prompts. The workflow generation layer is entirely custom because it targets our block format. The UX is entirely custom because it's the product.

---

## Key Technical Decisions

### Why not continuous video recording?

- 30fps × 1080p × 5 minutes = ~900 frames. Processing all of them is expensive and slow.
- Screenpipe proved that event-driven capture (screenshot only on meaningful interaction) gives you 95% of the information at 5% of the data.
- A 5-minute recording session might produce 20-50 captured events instead of 9,000 frames.

### Why not browser extension instead of Electron?

- Extensions can only see the browser. Electron can see everything — desktop apps, terminal, file system.
- The meeting assistant, screen recording, and global shortcuts all need Electron.
- Extensions can't capture across applications (Gmail → Slack → CRM → back to Gmail).

### Why start with cloud vision API, not local models?

- UI-TARS and OmniParser require GPU infrastructure or are slow on CPU.
- Claude/GPT-4V vision is accurate enough for MVP and available today.
- Users are already paying for gateway access. Vision API calls add marginal cost.
- Switch to local models later when volume justifies it or when privacy demands it.

### How does this connect to the "graduated autonomy" pitch?

1. **Level 0 (today):** User manually builds automations on the canvas.
2. **Level 1 (Phase R1-R3):** User records a workflow → agent proposes automation → user approves.
3. **Level 2 (future):** Agent watches `context_events` passively → notices repeated patterns → proposes automations unprompted.
4. **Level 3 (future):** Agent runs approved automations autonomously, only asks when uncertain.

Phase R1-R3 gets you to Level 1. Level 2 doesn't need screen recording at all — it works from the context layer events you've already built. Level 3 is the trigger runtime (Phase 4 in your main plan).

---

## Dependencies

| This plan needs | Status | Notes |
|-----------------|--------|-------|
| Electron shell (ELECTRON-PLAN Phase 1) | ✅ Done | Modular architecture, splash, tray |
| Trigger runtime (main Phase 4) | Not started | Needed for Level 3 autonomy, not for recording |
| Gateway with vision model access | Exists | Route Claude/GPT-4V calls through existing gateway |
| Block registry | Done | 180+ blocks already defined, used for mapping |
| Workflow CRUD API | Done | POST /api/workflows already works |
| Canvas rendering | Done | Generated workflows render immediately |

**Critical path:** Electron Phase 1 (shell) → Phase R1 (capture) → Phase R2 (understanding) → Phase R3 (generation). Everything else is parallel.

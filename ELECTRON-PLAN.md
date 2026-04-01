# Electron Integration Plan

> Turn basics-workspace into a cross-platform desktop app using Electron + the existing Next.js standalone server.

## Architecture

```
basics-workspace/
├── electron/
│   ├── main.ts              ← Electron main process
│   ├── preload.ts           ← Context bridge (IPC to renderer)
│   ├── splash.html          ← Loading screen during server startup
│   ├── updater.ts           ← Auto-update logic (electron-updater)
│   └── utils/
│       └── server.ts        ← Next.js server lifecycle management
├── next.config.ts           ← Already has output: "standalone"
├── electron-builder.yml     ← Packaging config
├── package.json             ← Add electron scripts + deps
└── ...existing app code     ← UNCHANGED
```

**Core idea:** Electron's main process spawns the Next.js standalone server on a random local port, then points a BrowserWindow at `http://127.0.0.1:{port}`. All existing code — API routes, Better Auth, PgBoss, SSE executor, proxy.ts — works unchanged.

---

## Phase 1: Minimal Electron Shell

**Goal:** Launch the existing app in an Electron window. No packaging, dev mode only.

### 1A — Install dependencies

```bash
npm install --save-dev electron electron-builder get-port-please concurrently wait-on
```

### 1B — Create `electron/main.ts`

- Use `app.whenReady()` to create a `BrowserWindow`
- **Dev mode:** Point at `http://localhost:3000` (existing `next dev`)
- **Prod mode:** Spawn the standalone server on a random port via `utilityProcess.fork()`
- Use `get-port-please` to find an available port (range 30011–50000)
- Bind to `127.0.0.1` only (security)

```ts
// Pseudocode for main.ts
import { app, BrowserWindow, utilityProcess } from 'electron';
import { getPort } from 'get-port-please';

const isDev = !app.isPackaged;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',   // Clean Mac look
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    const port = await getPort({ portRange: [30011, 50000] });
    // Start standalone server (see 1C)
    await startNextServer(port);
    win.loadURL(`http://127.0.0.1:${port}`);
  }
});
```

### 1C — Server lifecycle (`electron/utils/server.ts`)

- Fork the Next.js standalone `server.js` via `utilityProcess.fork()`
- Pass `PORT`, `HOSTNAME=127.0.0.1`, and all env vars
- Listen for a "ready" message or poll `http://127.0.0.1:{port}` until it responds
- Handle graceful shutdown on `app.quit()`
- PgBoss worker: controlled by existing `DISABLE_SCHEDULE_WORKER` env var — leave enabled for desktop

### 1D — Create `electron/preload.ts`

- Minimal for now — just expose `contextBridge` with app version info
- Will expand later for native features (file dialogs, notifications, etc.)

### 1E — Create `electron/splash.html`

- Simple HTML page with the Basics logo and a loading spinner
- Matches `--color-bg-base: #F9F7F4` background
- Shown while Next.js server starts (~1-3 seconds)

### 1F — Add dev scripts to `package.json`

```json
{
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "next build && electron-builder",
    "electron:start": "electron ."
  },
  "main": "electron/main.js"
}
```

### 1G — TypeScript config for Electron

- Add `tsconfig.electron.json` extending base config
- Target: `ES2022`, module: `commonjs`
- Include only `electron/**/*.ts`
- Build step: `tsc -p tsconfig.electron.json` before `electron-builder`

### Deliverable

Run `npm run electron:dev` → Basics Workspace opens in an Electron window, fully functional, pointing at the Next.js dev server.

---

## Phase 2: Production Build & Packaging

**Goal:** Package the app into distributable installers for Windows, Mac, and Linux.

### 2A — `electron-builder.yml` config

```yaml
appId: com.basics.workspace
productName: Basics
copyright: Copyright © 2026 Basics

directories:
  output: dist-electron
  buildResources: electron/resources

files:
  - electron/**/*.js
  - electron/**/*.html
  - .next/standalone/**/*
  - .next/static/**/*
  - public/**/*

extraMetadata:
  main: electron/main.js

win:
  target: nsis
  icon: electron/resources/icon.ico

mac:
  target: dmg
  icon: electron/resources/icon.icns
  category: public.app-category.productivity
  hardenedRuntime: true
  entitlements: electron/resources/entitlements.mac.plist
  entitlementsInherit: electron/resources/entitlements.mac.plist

linux:
  target: AppImage
  icon: electron/resources/icon.png
  category: Office

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
```

### 2B — Build pipeline script

```bash
# 1. Build Next.js standalone
next build

# 2. Copy static files into standalone (Next.js standalone quirk)
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 3. Compile Electron TypeScript
tsc -p tsconfig.electron.json

# 4. Package with electron-builder
electron-builder --config electron-builder.yml
```

### 2C — App icons

- Create `electron/resources/` with icons in all formats:
  - `icon.icns` (Mac)
  - `icon.ico` (Windows)
  - `icon.png` (Linux, 512x512)
- Use the existing Basics logo

### 2D — Environment variables for desktop

- Ship a default `.env.production` baked into the standalone build
- `DATABASE_URL` → configurable at first launch (see Phase 4)
- `BETTER_AUTH_URL` → dynamically set to `http://127.0.0.1:{port}`
- `BETTER_AUTH_SECRET` → generate a unique one per installation and persist in `app.getPath('userData')`
- `GATEWAY_URL` → point to production gateway (Railway)

### Deliverable

Run `npm run electron:build` → produces a `.exe` (Windows), `.dmg` (Mac), or `.AppImage` (Linux) installer.

---

## Phase 3: Native Desktop Features

**Goal:** Make it feel like a real desktop app, not just a website in a frame.

### 3A — Window management

- Remember window position and size (persist to `electron-store`)
- Restore on relaunch
- Proper minimize/maximize/close behavior
- Single-instance lock (`app.requestSingleInstanceLock()`) — prevent multiple copies

### 3B — System tray

- Tray icon with menu: Open, Quit
- Minimize to tray option (especially useful for background automations)
- Badge count for notifications (Mac dock badge, Windows taskbar overlay)

### 3C — Native menus

- Mac: proper app menu (Basics → About, Preferences, Quit)
- Edit menu with undo/redo/cut/copy/paste (needed for text input to work on Mac)
- Window menu with minimize/zoom
- Help menu

### 3D — Deep links

- Register `basics://` protocol handler
- Handle OAuth callbacks via deep link instead of redirect URL
- This fixes the OAuth flow for desktop — gateway redirects to `basics://oauth/callback?code=...` instead of `http://localhost:{port}/...`

### 3E — Notifications

- Bridge web notifications to native OS notifications via IPC
- Expose `window.electronAPI.notify()` via preload
- Show notifications for: automation run complete, errors, scheduled task results

### Deliverable

App feels native — proper menus, tray, window memory, deep links for OAuth.

---

## Phase 4: First-Run Experience & Configuration

**Goal:** Handle the fact that desktop users need to configure their database and gateway connections.

### 4A — First-run setup wizard

- On first launch, detect missing `DATABASE_URL`
- Show a setup screen (can be a Next.js page at `/setup`):
  1. **Connect to cloud** — enter your team's Basics cloud URL (remote Postgres, managed for them)
  2. **Self-hosted** — enter a Postgres connection string
- Persist config to `app.getPath('userData')/config.json`
- Pass config as env vars to the Next.js server on startup

### 4B — Settings page (desktop-specific)

- Add a "Desktop" section to the existing Settings page
- Options: start on login, minimize to tray, auto-update channel (stable/beta)
- Stored in `electron-store`

### 4C — Connection health check

- On startup, verify database connectivity before loading the app
- If DB is unreachable, show an error screen with retry + reconfigure options
- Periodic health check ping (every 60s)

### Deliverable

New users can set up the app without editing env files. Graceful handling of connection failures.

---

## Phase 5: Auto-Updates

**Goal:** Ship updates without users manually downloading new versions.

### 5A — electron-updater setup

```ts
// electron/updater.ts
import { autoUpdater } from 'electron-updater';

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', () => {
  // Notify renderer via IPC
});

autoUpdater.on('update-downloaded', () => {
  // Prompt user to restart
});

export function checkForUpdates() {
  autoUpdater.checkForUpdates();
}
```

### 5B — Release infrastructure

- GitHub Releases as the update server (free, works with electron-updater)
- CI/CD: GitHub Actions workflow that builds for all platforms on tag push
- Code signing: required for Mac (Apple Developer ID) and recommended for Windows (EV cert)

### 5C — Update UX

- Check for updates on launch + every 4 hours
- Show unobtrusive banner: "Update available — will install on restart"
- Never force-restart — automations might be running

### Deliverable

Push a new tag → CI builds installers → users get the update automatically.

---

## Phase 6: CI/CD & Distribution

**Goal:** Automated builds and distribution.

### 6A — GitHub Actions workflow

```yaml
# .github/workflows/electron-build.yml
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run next:build
      - run: npx electron-builder --publish always
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 6B — Code signing

- **Mac:** Apple Developer ID certificate ($99/yr Apple Developer Program)
- **Windows:** EV code signing cert (prevents SmartScreen warnings)
- **Linux:** No signing needed for AppImage

### 6C — Distribution channels

- GitHub Releases (primary — free, integrates with auto-updater)
- Optional: website download page
- Future: Mac App Store, Microsoft Store

### Deliverable

Tag a release → CI builds + signs + publishes for all platforms → users auto-update.

---

## Database Strategy

For the initial release, **remote Postgres** is the path:

| Approach | When to use |
|----------|-------------|
| **Remote Postgres** (Phase 1) | Default. Desktop app connects to hosted DB. Same data as web app. Requires internet. |
| **Bundled PGlite** (Future) | If offline-first is needed. PGlite is Postgres compiled to WASM — runs in-process, no external DB. Would require PgBoss alternative. |
| **Hybrid sync** (Future) | Local PGlite for offline + sync to remote Postgres when online. Complex but the best UX. |

Start with remote Postgres. Revisit if offline support becomes a priority.

---

## Estimated Bundle Size

| Component | Size |
|-----------|------|
| Electron (Chromium + Node.js) | ~150 MB |
| Next.js standalone + node_modules | ~80 MB |
| App code + static assets | ~20 MB |
| **Total (compressed installer)** | **~120-180 MB** |

Comparable to VS Code (~150MB), Slack (~300MB), Notion (~200MB).

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Localhost port conflicts | `get-port-please` with wide range (30011-50000) |
| Server crash in background | Watchdog in main process — auto-restart, show error UI |
| Slow startup (~1-3s) | Splash screen, cache server.js compilation |
| Security: local HTTP server | Bind `127.0.0.1` only, no external access |
| Mac notarization | Apple Developer ID + `electron-notarize` in CI |
| Windows SmartScreen | EV code signing cert |
| PgBoss in desktop context | Works fine with remote Postgres; disable if no DB configured |
| OAuth redirects | Deep links (`basics://`) for callback URLs |
| Large bundle size | Tree-shake standalone output, compress with ASAR |

---

## Phase Order & Dependencies

```
Phase 1 (Shell)          ← No dependencies, start here
  ↓
Phase 2 (Packaging)      ← Needs Phase 1
  ↓
Phase 3 (Native)         ← Needs Phase 2 (for testing in packaged app)
  ↓
Phase 4 (First-Run)      ← Needs Phase 2 (for env var management)
  ↓
Phase 5 (Auto-Update)    ← Needs Phase 2 + Phase 6
  ↓
Phase 6 (CI/CD)          ← Needs Phase 2, enables Phase 5
```

Phases 3 and 4 can be done in parallel. Phase 5 and 6 are tightly coupled.

---

## Key Principle

**Zero changes to existing Next.js code.** The Electron layer is purely additive — a new `electron/` directory, build scripts, and packaging config. The web app continues to work exactly as before. Desktop is just another way to run the same server.

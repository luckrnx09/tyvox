# tyvox-desktop

The Tyvox desktop app. An Electron main process (hotkeys, tray, windows, updater, embedded backend) plus a React renderer (recording capsule, settings UI), glued together by a typed IPC layer.

## Commands

```bash
pnpm dev          # vite dev server + electron (expects the backend on 127.0.0.1:23456)
pnpm build        # vite build (main, preload, renderer)
pnpm test         # vitest (renderer + main-process unit tests)
pnpm test:e2e     # Playwright Electron smoke tests — needs a display; use xvfb-run on Linux
pnpm typecheck    # tsc for both tsconfig.web.json and tsconfig.node.json
pnpm pack:mac     # build + electron-builder dmg
pnpm pack:linux   # build + electron-builder AppImage and deb
pnpm pack:win     # build + electron-builder nsis
```

## Structure

```
electron-src/    main process
  hotkey/        global hotkey registration
  ipc/           IPC handlers exposed to the renderer
  injection/     simulated clipboard paste into the target field
  recording/     audio capture coordination
  updater/       electron-updater against GitHub Releases
  backend.ts     embedded backend lifecycle
  ui/            windows & tray
client-src/      renderer (React, MUI, framer-motion, i18next)
  views/capsules/  the floating recording capsule
  views/settings/  settings window
  i18n/          UI locales
  hooks/  theme/  utils/
shared/          imported by both processes — IPC channel names, types, limits
e2e/             Playwright specs
scripts/         prepare-backend.mjs — bundles the backend for packaging
```

## Behaviors that surprise people

- **The capsule window is `focusable: false`** so the user's target field keeps focus for paste injection. Consequence: global key handling (hotkeys, Escape-to-cancel) lives in the main process, not the renderer.
- **Packaged builds embed the backend** and spawn it as a plain Node child with `TYVOX_PORT`/`TYVOX_HOST` in its environment. If something already serves that port (a dev backend, a standalone deployment), it is reused as-is.
- **Auto-update**: electron-updater handles Windows and Linux AppImage. Unsigned macOS builds can't auto-update (platform requires signing), and deb packages have no updater transport — both flag new versions on the About tab with a link to the release page instead.
- The tray icon is a single static logo; it does not reflect capsule state.

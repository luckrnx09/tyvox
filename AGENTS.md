# Tyvox

Voice dictation desktop app. Electron + React + Hono backend + TypeScript monorepo.

> **Active development.** Architecture and APIs are unstable. When your changes diverge from this document, update it. When uncertain about anything, ask before coding.

## Commands

```bash
pnpm dev            # start backend + desktop dev servers
pnpm build          # production build
pnpm pack:mac       # build + electron-builder dmg
pnpm pack:linux     # build + electron-builder AppImage and deb
pnpm pack:win       # build + electron-builder nsis
pnpm test           # run all tests
pnpm eval           # run polish prompt eval against a live LLM (EVAL_LLM_BASE_URL/MODEL/API_KEY to override)
pnpm lint           # oxlint
pnpm format         # oxfmt (format:check runs in the pre-push hook)
pnpm codegen        # regenerate SDK from OpenAPI (backend → openapi.yaml → client.ts)
pnpm release        # bump version, update CHANGELOG, commit, tag, and push
```

Backend environment variables:

| Variable     | Default     | Description                                 |
| ------------ | ----------- | ------------------------------------------- |
| `TYVOX_PORT` | `23456`     | Port the Hono backend binds to.             |
| `TYVOX_HOST` | `127.0.0.1` | Host/interface the Hono backend listens on. |

Run the backend in a container:

```bash
docker compose up   # backend on port 23456, data in tyvox-data volume
```

Type-check a specific package:

```bash
npx tsc --noEmit -p packages/sdk/tsconfig.json             # sdk
npx tsc --noEmit -p packages/desktop/tsconfig.web.json    # renderer
npx tsc --noEmit -p packages/desktop/tsconfig.node.json   # electron main
npx tsc --noEmit -p packages/backend/tsconfig.json        # backend
```

## Architecture

```
packages/
  backend/     Hono API server
  desktop/     Electron app (main process + renderer + shared)
  sdk/         OpenAPI spec, Zod contracts, and generated TypeScript fetch client
```

- **backend** — API routes, ASR providers, LLM-based polish, user config, vocabulary; uses Zod schemas from `sdk/contracts`. Key decisions:
  - Listens on `TYVOX_HOST`:`TYVOX_PORT` (defaults to `127.0.0.1:23456`); clients use the same values.
  - Local ASR shells out to whisper/sensevoice binaries downloaded per platform at runtime, with mirror fallback when the primary source fails; cloud ASR providers plug into the same provider abstraction.
  - Persistence is abstracted behind repository interfaces keyed by `userId` (never file paths); a single module composes the file-based implementation — swap that one module to change storage.
  - Services are stateless functions parameterized by `userId`; one global memory scheduler scans all users instead of per-user schedulers.
- **desktop** — Main process (hotkey, IPC, tray, windows, updater, embedded backend), renderer (React, MUI, framer-motion), shared types/channels/limits. Key decisions:
  - The capsule window is `focusable: false` so the user's target field keeps focus for paste injection; consequently global key handling (hotkeys, Escape-to-cancel) lives in the main process, not the renderer.
  - Packaged builds embed the backend and spawn it as a plain Node child, passing `TYVOX_PORT`/`TYVOX_HOST` into its environment; if something already serves that port (dev backend, future standalone deployment) it is reused as-is.
  - Auto-update uses electron-updater against GitHub Releases on Win/Linux; macOS builds are signed with a stable self-signed certificate and update in-app: the main process downloads the dmg with progress events (Electron net stack, system-proxy aware), then a detached script (`electron-src/resources/scripts/update-mac.sh`) swaps the app bundle and relaunches.
  - Tray icon is a single static logo; it does not reflect capsule state. Logo SVGs live in `assets/logo/` — they are the source of truth, PNGs are exports.
- **sdk** — Source of truth for API data shapes (config, ASR models, vocabulary, transcribe) plus the generated client produced by `pnpm codegen` (orval + post-process for PascalCase type names). `sdk/server` also hosts the route definitions and `Services` DI types so OpenAPI codegen can run without the backend; the backend composes the real implementations.

## Data flow

```
Hotkey pressed
  → Capsule window enters recording state
  → Web Audio captures 16kHz mono PCM
  → Audio chunks streamed to backend via HTTP

Recording stopped
  → Backend assembles WAV, runs ASR provider (local whisper/sensevoice or cloud API)
  → Backend returns raw transcription

Polish (optional)
  → Raw text sent to LLM for refinement / translation
  → Streaming response returned to capsule

Text injected
  → Capsule simulates clipboard paste into the active text field
```

## Release flow

Run `pnpm release <version>` (e.g. `pnpm release 0.2.0`) to bump `package.json` and `packages/desktop/package.json`, generate a `CHANGELOG.md` entry from commits since the last tag, open a release PR on branch `chore/release-v<version>`, wait for checks and squash-merge it, then tag the merged commit on master and push the tag. Requires the `gh` CLI. Two workflows: `ci.yml` runs the gate suite (lint, format, typecheck, unit tests, Electron E2E under xvfb) on every PR and master push; `release.yml` is tag-triggered, re-runs the gates, then packages all three platforms and produces a GitHub release with the electron-updater metadata that clients poll. The tag must match `packages/desktop/package.json` version.

## Code style

- No comments — code should be self-documenting
- No abbreviations in names
- No dead code — delete unused i18n keys, functions, types immediately
- TypeScript strict, no `any`
- MUI components + `sx`/`styled` for styling, no CSS files, no direct Emotion usage
- Custom components live next to the feature that uses them (`views/<feature>/components/` or `views/<feature>/<component>/`)
- `for...of` not `.forEach()`
- Early returns for guard clauses

## AI agent rules

1. **Keep AGENTS.md in sync.** If your changes make this document inaccurate, update it in the same PR.
2. **Ask before implementing.** Present your proposed solution and get approval before writing code for non-trivial changes.
3. **Ask when uncertain.** If you lack context to make a confident decision, ask — don't guess.
4. **Run `pnpm lint`, `pnpm format:check`, and type-check relevant packages before pushing.** If the push hook fails, fix the issue and recommit — don't bypass hooks.
5. **Match existing patterns.** Follow the conventions you find in the codebase. Don't introduce new patterns without discussion.
6. **Self-review before delivery.** After completing a task, review your own code for style issues, dead code, and potential risks. Fix them before handing off.
7. **Explore first, code second.** Read existing code before writing. Avoid duplicating logic or introducing similar-but-different implementations. Elegant code always beats delivery speed.

## Testing

```bash
pnpm test                     # all tests (sdk + backend + desktop)
pnpm vitest run               # tests of the package in the current directory
pnpm vitest run -t "<name>"   # single test
pnpm -C packages/desktop test:e2e   # Electron E2E smoke tests (needs a display; use xvfb-run on Linux)
```

## Commit convention

```
<type>(<scope>): <message>
```

Examples: `fix(desktop): ...`, `refactor(sdk): ...`, `feat(backend): ...`

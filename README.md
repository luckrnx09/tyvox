<p align="center">
  <img src="assets/logo/logo.png" alt="Tyvox logo" width="128" height="128" />
</p>

<h1 align="center">Tyvox</h1>

<p align="center">
  <strong>Your voice types for you.</strong><br/>
  Hold a hotkey, speak, and well-written text appears at your cursor — in any app.
</p>

<p align="center">
  <a href="https://github.com/luckrnx09/tyvox/actions/workflows/ci.yml"><img src="https://github.com/luckrnx09/tyvox/actions/workflows/ci.yml/badge.svg" alt="Build" /></a>
  <img src="https://img.shields.io/badge/license-MIT-6C5CE7" alt="MIT license" />
  <img src="https://img.shields.io/badge/macOS%20%C2%B7%20Windows%20%C2%B7%20Linux-supported-6C5CE7" alt="Platforms" />
  <img src="https://img.shields.io/badge/ASR-local%20on--device-6C5CE7" alt="Local ASR" />
</p>

---

<p align="center">
  <img src="assets/demo/polish-demo.gif" alt="Tyvox polish demo: raw speech in, clean text out" width="960" />
</p>

Typing is the slowest part of thinking. Tyvox removes it: press a hotkey anywhere on your desktop, speak naturally, and polished text lands exactly where you were about to type. Speech recognition runs on your machine by default, and an optional LLM pass turns rambling into clean prose — or another language.

> [!WARNING]
> Tyvox is in active development. The backend API has no authentication yet — never expose it to untrusted networks or the public internet. Keep it on `127.0.0.1` (the default) or bind it to localhost as the provided `docker-compose.yml` does.

## Why Tyvox?

- **One hotkey, zero friction** — push-to-talk or toggle; the recording capsule never steals focus from the field where your text goes.
- **On-device speech recognition** — whisper/sensevoice runs locally; your voice never has to leave the machine. Cloud ASR providers plug in when you want them.
- **LLM polish & translation** — raw speech becomes clean prose, or another language, streamed back as you watch.
- **Personal vocabulary** — names, jargon, and your writing style are learned and respected.
- **Feels native** — global hotkeys, a quiet tray icon, automatic updates, and an embedded backend that starts and stops with the app. Nothing to deploy, nothing to babysit.

## Installation

### One-click install

Copy and run the command for your platform:

- **macOS / Linux**

  ```bash
  curl -fsSL https://raw.githubusercontent.com/luckrnx09/tyvox/master/scripts/install.sh | bash
  ```

- **Windows** (PowerShell)

  ```powershell
  irm https://raw.githubusercontent.com/luckrnx09/tyvox/master/scripts/install.ps1 | iex
  ```

### Manual install

Download the installer for your platform from [GitHub Releases](https://github.com/luckrnx09/tyvox/releases):

| Platform | File                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| macOS    | `Tyvox-*.dmg`         | Signed with our own self-signed certificate (not Apple-notarized), ARM and Intel builds. macOS may still block first launch as an unidentified developer — right-click the app and choose **Open**, or run `xattr -rd com.apple.quarantine /Applications/Tyvox.app`. Do not re-sign the app yourself: that would replace the certificate identity and break permission persistence across updates. If macOS moved the app to the Trash, reinstall it from the dmg first. |
| Windows  | `Tyvox Setup *.exe`   | NSIS installer with auto-update.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Linux    | `Tyvox-*.AppImage`    | Make it executable and run; supports auto-update.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Linux    | `tyvox-desktop_*.deb` | Install with `sudo dpkg -i`; new versions are flagged on the About tab for manual upgrade.                                                                                                                                                                                                                                                                                                                                                                               |

The app asks for two permissions — **microphone** and **accessibility** (global hotkey + simulated paste). The settings page walks you through both on first launch. Builds are signed with a stable self-signed identity, so both grants survive updates.

### Auto-update

- **Windows / Linux AppImage** — updates download in the background and apply on restart.
- **macOS** — updates in-app: a detached script swaps the app bundle and relaunches (self-signed builds can't use electron-updater).
- **deb** — the About tab flags new versions and links to the release page.

## Uninstall

- **macOS** — drag `/Applications/Tyvox.app` to the Trash, or run:

  ```bash
  rm -rf /Applications/Tyvox.app
  ```

- **Linux** — remove the AppImage binary and desktop entry:

  ```bash
  rm -f ~/.local/bin/tyvox
  rm -f ~/.local/share/applications/tyvox.desktop
  ```

- **Windows** — run the uninstaller:

  ```powershell
  & "$env:LOCALAPPDATA\Programs\Tyvox\Uninstall Tyvox.exe"
  ```

  Or remove Tyvox from **Settings → Apps → Installed apps**.

## Privacy

- **Speech recognition is local by default.** The embedded ASR runs entirely on your machine through `whisper`/`sensevoice`; audio and transcripts are not sent anywhere unless you explicitly enable a cloud provider.
- **Cloud providers are optional.** Cloud ASR or LLM polish can be enabled in settings; when enabled, only the necessary data is sent to the configured provider.
- **Your data stays on device.** Configuration, vocabulary, and downloaded models are stored in `~/.tyvox`.

## Development

```bash
pnpm install
pnpm dev        # start backend (127.0.0.1:23456) + desktop
pnpm test       # all tests
pnpm -C packages/desktop test:e2e   # Electron E2E (needs a display; use xvfb-run on Linux)
```

## Architecture

Tyvox is a TypeScript monorepo. Each package has its own README:

| Package                                | Purpose                                                         |
| -------------------------------------- | --------------------------------------------------------------- |
| [`packages/sdk`](packages/sdk)         | OpenAPI contracts, Zod schemas, generated TypeScript client     |
| [`packages/backend`](packages/backend) | Hono API server: ASR, LLM polish, config, vocabulary, memory    |
| [`packages/desktop`](packages/desktop) | Electron app: main process, React renderer, shared IPC contract |

See [AGENTS.md](AGENTS.md) for contributor-facing details. Logo source files live in [assets/logo](assets/logo/README.md).

## License

[MIT](LICENSE)

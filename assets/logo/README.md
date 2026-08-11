# Logo

Final design: **wave capsule** ([logo.svg](logo.svg), preview [logo.png](logo.png)).

The SVG is the single source of truth; every PNG is exported from it — never edit PNGs by hand.

## Icon pipeline per platform

Neither electron-builder nor Electron's Tray `nativeImage` accepts SVG, so PNG exports are required:

| Purpose           | Location                                                                            | Notes                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| App icon (1024)   | `packages/desktop/electron-src/resources/icon.png`                                  | `mac.icon` / `win.icon`; electron-builder converts to icns / ico at build time                                     |
| Linux sized icons | `packages/desktop/electron-src/resources/icons/{16,32,48,64,128,256,512}x{...}.png` | `linux.icon` points at this directory; deb/AppImage install per hicolor sizes                                      |
| Tray (static)     | `packages/desktop/electron-src/resources/tray/logo.png` + `logo@2x.png`             | Same logo at 16px (1x) and 32px (2x); square representations, no forced resize; does not change with capsule state |

Re-export everything (requires `pip install cairosvg`):

```bash
# App icon
cairosvg assets/logo/logo.svg -o packages/desktop/electron-src/resources/icon.png --output-width 1024 --output-height 1024

# Linux sizes
for s in 16 32 48 64 128 256 512; do
  cairosvg assets/logo/logo.svg -o packages/desktop/electron-src/resources/icons/${s}x${s}.png --output-width $s --output-height $s
done

# Tray (1x + 2x)
cairosvg assets/logo/logo.svg -o packages/desktop/electron-src/resources/tray/logo.png --output-width 16 --output-height 16
cairosvg assets/logo/logo.svg -o packages/desktop/electron-src/resources/tray/logo@2x.png --output-width 32 --output-height 32

# Preview (this directory)
cairosvg assets/logo/logo.svg -o assets/logo/logo.png --output-width 1024 --output-height 1024
```

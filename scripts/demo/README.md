# Demo GIF generator

Generates `assets/demo/polish-demo.gif` — the hero animation in the root
README. No screen recording involved: the animation is an HTML page rendered
frame by frame by a headless Electron window, then encoded with ffmpeg.

## Usage

```bash
bash scripts/demo/generate.sh
```

Requirements: repo dependencies installed (`pnpm install`) and `ffmpeg` on
PATH. Runs headless — no display needed. Produces both
`assets/demo/polish-demo.gif` and `polish-demo.mp4`; the README embeds the
mp4 via an autoplaying muted `<video>` tag because GitHub pauses GIFs for
visitors with reduced-motion settings.

## Editing the content

All copy lives in the `SCENES` array at the top of `animation.html`:

```js
{
  raw: "i use cloud code for pair programming",
  out: [["I use ", 0], ["Claude Code", 1], [" for pair programming.", 0]],
}
```

- `raw` — the spoken text, typed out character by character in the dim
  monospace style.
- `out` — the polished result, as `[text, highlight]` token pairs. `1`
  renders the token in brand purple, `0` in plain bright text. Use `\n` for
  line breaks.

Timing constants (`RAW_CHAR_MS`, `OUT_CHAR_MS`, `PROCESS_MS`, `HOLD_MS`,
`FADE_MS`) sit right below `SCENES`. Colors and layout are in the `<style>`
block; the page is a fixed 1280×460 stage.

After editing, re-run `generate.sh` and commit the updated GIF.

## How it works

1. `animation.html` plays the scenes in order and sets `window.__done` when
   finished.
2. `capture.cjs` loads the page in an offscreen Electron `BrowserWindow` and
   saves a PNG frame every 66 ms until `__done` flips.
3. `generate.sh` encodes the frames with ffmpeg's two-pass palette flow
   (`palettegen` → `paletteuse`), which keeps a ~22 s loop around 256 KB.

Keep the scenes honest: every transformation shown should come from a real
prompt rule in `packages/backend/src/services/transform/prompts/`.

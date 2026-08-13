#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRAMES_DIR=$(mktemp -d)
trap 'rm -rf "$FRAMES_DIR"' EXIT

cd "$REPO_ROOT/packages/desktop"
npx electron --ozone-platform=headless --disable-gpu --no-sandbox \
  "$REPO_ROOT/scripts/demo/capture.cjs" "$FRAMES_DIR"

mkdir -p "$REPO_ROOT/assets/demo"
ffmpeg -y -framerate 15 -i "$FRAMES_DIR/frame-%05d.png" \
  -vf "fps=15,palettegen=max_colors=128:stats_mode=diff" "$FRAMES_DIR/palette.png"
ffmpeg -y -framerate 15 -i "$FRAMES_DIR/frame-%05d.png" -i "$FRAMES_DIR/palette.png" \
  -lavfi "fps=15 [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=4" \
  "$REPO_ROOT/assets/demo/polish-demo.gif"

ls -lh "$REPO_ROOT/assets/demo/polish-demo.gif"

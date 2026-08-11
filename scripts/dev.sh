#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PID=""
CLEANED_UP=0

cleanup() {
  if [ "$CLEANED_UP" -eq 1 ]; then return; fi
  CLEANED_UP=1
  echo ""
  echo "Shutting down..."
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  echo "Done."
}
trap cleanup EXIT INT TERM

echo "Starting backend..."
pnpm -C "$ROOT_DIR/packages/backend" dev &
BACKEND_PID=$!

echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:23456/health >/dev/null 2>&1; then
    echo "Backend ready on http://localhost:23456"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Backend failed to start within 30s"
    exit 1
  fi
  sleep 1
done

echo "Starting desktop app..."
exec pnpm -C "$ROOT_DIR/packages/desktop" dev

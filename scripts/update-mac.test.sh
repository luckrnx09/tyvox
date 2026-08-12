#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UPDATE_SCRIPT="$SCRIPT_DIR/../packages/desktop/electron-src/resources/scripts/update-mac.sh"
STUB_BIN=$(mktemp -d)
WORK=$(mktemp -d)
trap 'rm -rf "$STUB_BIN" "$WORK"' EXIT

mkdir -p "$WORK/Applications"

cat > "$STUB_BIN/kill" <<'EOF'
#!/usr/bin/env bash
echo "kill $*" >> "$CALL_LOG"
exit 1
EOF

cat > "$STUB_BIN/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl $*" >> "$CALL_LOG"
out=""
prev=""
for a in "$@"; do [ "$prev" = "-o" ] && out="$a"; prev="$a"; done
echo dmg > "$out"
EOF

cat > "$STUB_BIN/hdiutil" <<'EOF'
#!/usr/bin/env bash
echo "hdiutil $*" >> "$CALL_LOG"
if [ "${1:-}" = "detach" ]; then exit 0; fi
while [ $# -gt 0 ]; do
  if [ "$1" = "-mountpoint" ]; then mkdir -p "$2/Tyvox.app"; shift 2; else shift; fi
done
EOF

cat > "$STUB_BIN/rm" <<'EOF'
#!/usr/bin/env bash
echo "rm $*" >> "$CALL_LOG"
[ "${RM_FAIL:-}" = "1" ] && exit 1
exit 0
EOF

cat > "$STUB_BIN/cp" <<'EOF'
#!/usr/bin/env bash
echo "cp $*" >> "$CALL_LOG"
EOF

cat > "$STUB_BIN/xattr" <<'EOF'
#!/usr/bin/env bash
echo "xattr $*" >> "$CALL_LOG"
EOF

cat > "$STUB_BIN/osascript" <<'EOF'
#!/usr/bin/env bash
echo "osascript $*" >> "$CALL_LOG"
EOF

cat > "$STUB_BIN/open" <<'EOF'
#!/usr/bin/env bash
echo "open $*" >> "$CALL_LOG"
EOF

cat > "$STUB_BIN/mktemp" <<'EOF'
#!/usr/bin/env bash
echo "mktemp $*" >> "$CALL_LOG"
d="$WORK_DIR/$(date +%s%N)"
mkdir -p "$d"
echo "$d"
EOF

chmod +x "$STUB_BIN"/*

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

run_update() {
  CALL_LOG="$WORK/calls"
  : > "$CALL_LOG"
  export CALL_LOG
  PATH="$STUB_BIN:$PATH" WORK_DIR="$WORK" RM_FAIL="${RM_FAIL:-}" \
    bash "$UPDATE_SCRIPT" 1234 "$WORK/Applications/Tyvox.app" "https://example/Tyvox-1.0.0-arm64.dmg"
  cat "$CALL_LOG"
}

output=$(run_update)
echo "$output" | grep -q "curl .*https://example/Tyvox-1.0.0-arm64.dmg" || fail "download missing"
! echo "$output" | grep -q "osascript" || fail "osascript used on happy path"
echo "$output" | grep -q "open $WORK/Applications/Tyvox.app" || fail "relaunch missing"
echo "$output" | grep -q "xattr -rd com.apple.quarantine" || fail "quarantine removal missing"

RM_FAIL=1
output=$(run_update)
echo "$output" | grep -q "osascript" || fail "osascript fallback missing"
unset RM_FAIL

echo "PASS"

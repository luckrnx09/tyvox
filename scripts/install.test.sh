#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STUB_BIN=$(mktemp -d)
trap 'rm -rf "$STUB_BIN"' EXIT

cat > "$STUB_BIN/uname" <<'EOF'
#!/usr/bin/env bash
[ "${1:-}" = "-s" ] && echo Darwin || echo arm64
EOF

cat > "$STUB_BIN/hdiutil" <<'EOF'
#!/usr/bin/env bash
echo "hdiutil $*" >> "$CALL_LOG"
if [ "${1:-}" = "detach" ]; then exit 0; fi
while [ $# -gt 0 ]; do
  if [ "$1" = "-mountpoint" ]; then mkdir -p "$2/Tyvox.app"; shift 2; else shift; fi
done
EOF

cat > "$STUB_BIN/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl $*" >> "$CALL_LOG"
if [[ "$*" == *" -o "* ]]; then
  out=""
  prev=""
  for a in "$@"; do [ "$prev" = "-o" ] && out="$a"; prev="$a"; done
  echo dmg > "$out"
else
  command /usr/bin/curl "$@"
fi
EOF

cat > "$STUB_BIN/rm" <<'EOF'
#!/usr/bin/env bash
echo "rm $*" >> "$CALL_LOG"
if [ "${RM_FAIL:-}" = "1" ]; then exit 1; fi
EOF

cat > "$STUB_BIN/cp" <<'EOF'
#!/usr/bin/env bash
echo "cp $*" >> "$CALL_LOG"
if [ "${CP_FAIL:-}" = "1" ]; then exit 1; fi
EOF

cat > "$STUB_BIN/xattr" <<'EOF'
#!/usr/bin/env bash
echo "xattr $*" >> "$CALL_LOG"
if [ "${XATTR_FAIL:-}" = "1" ]; then exit 1; fi
EOF

cat > "$STUB_BIN/sudo" <<'EOF'
#!/usr/bin/env bash
echo "sudo $*" >> "$CALL_LOG"
EOF

chmod +x "$STUB_BIN"/*

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

run_install() {
  CALL_LOG=$(mktemp)
  export CALL_LOG
  PATH="$STUB_BIN:$PATH" RM_FAIL="${RM_FAIL:-}" CP_FAIL="${CP_FAIL:-}" XATTR_FAIL="${XATTR_FAIL:-}" bash "$SCRIPT_DIR/install.sh" >/dev/null
  cat "$CALL_LOG"
  rm -f "$CALL_LOG"
}

output=$(run_install)
echo "$output" | grep -q "xattr -rd com.apple.quarantine /Applications/Tyvox.app" ||
  fail "quarantine removal missing"
! echo "$output" | grep -q "codesign" || fail "ad-hoc re-sign must be gone"
! echo "$output" | grep -q "^sudo" || fail "sudo used on happy path"
! echo "$output" | grep -q "spctl" || fail "spctl must stay removed"

RM_FAIL=1
output=$(run_install)
echo "$output" | grep -q "sudo rm -rf /Applications/Tyvox.app" || fail "sudo rm fallback missing"
unset RM_FAIL

CP_FAIL=1
output=$(run_install)
echo "$output" | grep -q "sudo cp -R" || fail "sudo cp fallback missing"
unset CP_FAIL

XATTR_FAIL=1
output=$(run_install)
echo "$output" | grep -q "sudo xattr -rd com.apple.quarantine" || fail "sudo xattr fallback missing"
unset XATTR_FAIL

echo "PASS"

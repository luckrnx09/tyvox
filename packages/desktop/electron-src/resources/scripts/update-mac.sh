#!/usr/bin/env bash
set -euo pipefail

APP_PID="$1"
APP_PATH="$2"
DMG_PATH="$3"
APP_DIR="$(dirname "$APP_PATH")"

while kill -0 "$APP_PID" 2>/dev/null; do sleep 0.5; done

tmpdir=$(mktemp -d)
mount_dir="${tmpdir}/mnt"
mkdir -p "$mount_dir"
trap "hdiutil detach '${mount_dir}' -quiet >/dev/null 2>&1 || true; rm -rf '${tmpdir}'" EXIT

hdiutil attach "$DMG_PATH" -nobrowse -readonly -mountpoint "$mount_dir" -quiet

replace_app() {
  rm -rf "$APP_PATH" &&
    cp -R "${mount_dir}/Tyvox.app" "$APP_DIR/" &&
    xattr -rd com.apple.quarantine "$APP_PATH"
}

if ! replace_app 2>/dev/null; then
  helper="${tmpdir}/privileged-replace.sh"
  printf '#!/usr/bin/env bash\nrm -rf %q && cp -R %q %q && xattr -rd com.apple.quarantine %q\n' \
    "$APP_PATH" "${mount_dir}/Tyvox.app" "${APP_DIR}/" "$APP_PATH" > "$helper"
  chmod +x "$helper"
  osascript -e "do shell script \"${helper}\" with administrator privileges"
fi

open "$APP_PATH"

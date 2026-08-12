#!/usr/bin/env bash
set -euo pipefail

REPO="luckrnx09/tyvox"
APP_NAME="Tyvox"

get_latest_release() {
  curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" |
    grep '"tag_name":' |
    sed -E 's/.*"([^"]+)".*/\1/'
}

detect_platform() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux) echo "linux" ;;
    *) echo "unsupported" ;;
  esac
}

install_macos() {
  local tag="$1"
  local dmg_urls dmg_url
  dmg_urls=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/tags/${tag}" |
    grep '"browser_download_url":' |
    sed -E 's/.*"([^"]+)".*/\1/' |
    grep '\.dmg$')

  if [ "$(uname -m)" = "arm64" ]; then
    dmg_url=$(echo "$dmg_urls" | grep -- '-arm64\.dmg$' | head -n 1)
  else
    dmg_url=$(echo "$dmg_urls" | grep -v -- '-arm64\.dmg$' | head -n 1)
  fi

  if [ -z "$dmg_url" ]; then
    echo "No .dmg asset found for ${tag} ($(uname -m))" >&2
    exit 1
  fi

  local tmpdir mount_dir
  tmpdir=$(mktemp -d)
  mount_dir="${tmpdir}/mnt"
  mkdir -p "$mount_dir"
  trap "hdiutil detach '${mount_dir}' -quiet >/dev/null 2>&1 || true; rm -rf '${tmpdir}'" EXIT

  echo "Downloading ${dmg_url}..."
  curl -fsSL -o "${tmpdir}/Tyvox.dmg" "$dmg_url"

  hdiutil attach "${tmpdir}/Tyvox.dmg" -nobrowse -readonly -mountpoint "$mount_dir" -quiet

  cp -R "${mount_dir}/Tyvox.app" /Applications/
  hdiutil detach "$mount_dir" -quiet >/dev/null 2>&1 || true

  echo "Removing Gatekeeper quarantine and self-signing ${APP_NAME}..."
  sudo xattr -rd com.apple.quarantine "/Applications/${APP_NAME}.app"
  sudo codesign --force --deep --sign - "/Applications/${APP_NAME}.app"

  echo "${APP_NAME} installed to /Applications."
}

install_linux() {
  local tag="$1"
  local appimage_url
  appimage_url=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/tags/${tag}" |
    grep '"browser_download_url":' |
    sed -E 's/.*"([^"]+)".*/\1/' |
    grep '\.AppImage$' | head -n 1)

  if [ -z "$appimage_url" ]; then
    echo "No .AppImage asset found for ${tag}" >&2
    exit 1
  fi

  mkdir -p ~/.local/bin ~/.local/share/applications
  local target="${HOME}/.local/bin/tyvox"

  echo "Downloading ${appimage_url}..."
  curl -fsSL -o "$target" "$appimage_url"
  chmod +x "$target"

  cat > "${HOME}/.local/share/applications/tyvox.desktop" <<EOF
[Desktop Entry]
Name=${APP_NAME}
Comment=Your voice types for you
Exec=${target}
Type=Application
Categories=Utility;
Terminal=false
EOF

  echo "${APP_NAME} installed to ${target}."
}

main() {
  local platform
  platform=$(detect_platform)
  if [ "$platform" = "unsupported" ]; then
    echo "Unsupported platform: $(uname -s)" >&2
    exit 1
  fi

  local tag
  tag=$(get_latest_release)
  if [ -z "$tag" ]; then
    echo "Could not determine latest release" >&2
    exit 1
  fi

  case "$platform" in
    macos) install_macos "$tag" ;;
    linux) install_linux "$tag" ;;
  esac
}

main "$@"

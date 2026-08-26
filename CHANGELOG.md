# Changelog

## [0.0.15] - 2026-08-26

### Fixed

- fix(scripts): drop redundant release branch deletion (#36)

### Changed

- chore: system CA via Node flag, drop electron-vite, bump deps, macOS CI gates (#37)

## [0.0.14] - 2026-08-25

### Fixed

- fix(desktop): apply settings window top padding only on macOS (#34)
- fix(scripts): adapt release flow to squash-only merges (#33)

### Changed

- chore: exclude CHANGELOG.md from oxfmt (#32)

## [0.0.13] - 2026-08-25

### Fixed

- fix(desktop): hide menu bar in settings window on Windows/Linux (#29)
- fix(backend): merge system CAs with bundled CA store (#30)

### Changed

- docs: Revise warnings and add macOS testing note (#28)

## [0.0.12] - 2026-08-20

### Fixed

- fix(backend): surface tar stderr on ASR extraction failure (#24)
- fix(desktop): About tab check button visibility (#18)

### Changed

- docs: demo GIF at portfolio-card aspect (1.85:1) (#23)
- Revert "autoplaying demo video" (#20, #21) (#22)
- docs: fix blank demo video (jsDelivr src) (#21)
- docs: autoplaying demo video in README (#20)
- docs: polish demo GIF in README hero (#19)

## [0.0.11] - 2026-08-13

### Added

- feat(desktop): launch-at-login toggle (Basic section) (#17)

## [0.0.10] - 2026-08-13

### Added

- feat(desktop): update UX — progress download, quiet quit, About layout (#16)

## [0.0.9] - 2026-08-13

### Changed

- chore: bump for in-app update dialog verification

## [0.0.8] - 2026-08-12

### Fixed

- fix(desktop): update check silently always up-to-date (#15)

## [0.0.7] - 2026-08-12

### Changed

- chore: bump for in-app update dialog verification

## [0.0.6] - 2026-08-12

### Fixed

- fix(desktop): update check via releases page + net.fetch (#14)

## [0.0.5] - 2026-08-12

### Changed

- chore: bump for update-chain verification release

## [0.0.4] - 2026-08-12

### Fixed

- fix(desktop): allow-jit entitlement for hardened runtime (#13)

## [0.0.3] - 2026-08-12

### Added

- feat(desktop): macOS install & update experience (#9)

## [0.0.2] - 2026-08-12

### Fixed

- fix(desktop): macOS install polish (#8)
- fix(scripts): robust macOS install (#7)
- fix(scripts): macOS install fails on dmg volume name with spaces (#6)

## [0.0.1] - 2026-08-11

### Added

- feat: initial import of Tyvox

### Changed

- Merge pull request #1 from luckrnx09/feat/initial-import
- chore: initial commit

All notable changes to this project are documented in this file.

## [Unreleased]

- Pre-v1 cleanup: removed design artifacts, trimmed configs, deleted dead code, split SDK fetch-wrapper, made backend port configurable, added install/release scripts, and refreshed documentation.

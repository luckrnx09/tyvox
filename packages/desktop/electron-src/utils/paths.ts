import { app } from "electron";
import { join } from "node:path";

/**
 * Resolve a path to a bundled resource (binaries, icons, strategies).
 * In dev: <packages/desktop>/electron-src/resources/<...> (this file bundles
 * into out/main, two levels up is the package root). In packaged:
 * process.resourcesPath/<...>.
 */
export function getResourcePath(...segments: string[]): string {
  const base = app.isPackaged
    ? process.resourcesPath
    : join(__dirname, "..", "..", "electron-src", "resources");
  return join(base, ...segments);
}

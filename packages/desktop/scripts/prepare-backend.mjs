import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = join(desktopDir, "..", "backend");
const targetDir = join(desktopDir, "electron-src", "resources", "backend");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

run(pnpm, ["-C", backendDir, "build"]);
rmSync(targetDir, { force: true, recursive: true });
mkdirSync(targetDir, { recursive: true });
copyFileSync(join(backendDir, "dist", "index.mjs"), join(targetDir, "index.mjs"));

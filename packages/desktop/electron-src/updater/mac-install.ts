import { app } from "electron";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { logger } from "../utils/logger";

export function installMacUpdate(dmgPath: string): void {
  const script = join(process.resourcesPath, "scripts", "update-mac.sh");
  const appPath = app.getPath("exe").replace(/\/Contents\/MacOS\/[^/]+$/, "");
  logger.info("Launching macOS update script", { script, appPath, dmgPath });
  const child = spawn("bash", [script, String(process.pid), appPath, dmgPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  app.quit();
}

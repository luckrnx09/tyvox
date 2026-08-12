import { app, systemPreferences } from "electron";
import { exec } from "child_process";
import { registerHandler } from "./router";
import { updaterService } from "../../updater";
import { ensureFreshAccessibilityGrant } from "../../utils/accessibility";
import { isMac } from "../../utils/platform";
import { IPC } from "../../../shared/channels";

export function registerSystemHandlers(): void {
  registerHandler(IPC.UPDATE_CHECK, () => updaterService.check());
  registerHandler(IPC.UPDATE_OPEN_RELEASES, () => updaterService.openReleasesPage());
  registerHandler(IPC.UPDATE_QUIT_INSTALL, () => updaterService.quitAndInstall());
  registerHandler(IPC.GET_PLATFORM, () => ({
    arch: process.arch,
    platform: process.platform as "darwin" | "linux" | "win32",
    version: process.getSystemVersion?.() ?? "unknown",
  }));
  registerHandler(IPC.GET_APP_VERSION, () => app.getVersion());
  registerHandler(IPC.OPEN_SYSTEM_PREFS, () => {
    if (isMac()) {
      exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"');
    }
  });
  registerHandler(IPC.OPEN_ACCESSIBILITY_PREFS, () => {
    if (isMac()) {
      systemPreferences.isTrustedAccessibilityClient(true);
      exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
    }
  });
  registerHandler(IPC.GET_A11Y_PERMISSION, async () => ({
    granted: await ensureFreshAccessibilityGrant(),
    osName: process.platform,
  }));
}

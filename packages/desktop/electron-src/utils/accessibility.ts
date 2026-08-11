import { systemPreferences } from "electron";
import { exec } from "node:child_process";
import { isMac } from "./platform";
import { logger } from "./logger";

const MAC_BUNDLE_ID = "com.tyvox.dictation";
const TCC_RESET_TIMEOUT_MS = 5000;

let staleGrantResetAttempted = false;

function resetAccessibilityTcc(): Promise<void> {
  return new Promise((resolve) => {
    exec(
      `tccutil reset Accessibility ${MAC_BUNDLE_ID}`,
      { timeout: TCC_RESET_TIMEOUT_MS, windowsHide: true },
      (err) => {
        if (err) {
          logger.warn("Failed to reset stale accessibility grant", { error: String(err) });
        }
        resolve();
      },
    );
  });
}

export async function ensureFreshAccessibilityGrant(): Promise<boolean> {
  if (!isMac()) return true;
  if (systemPreferences.isTrustedAccessibilityClient(false)) return true;
  if (!staleGrantResetAttempted) {
    staleGrantResetAttempted = true;
    await resetAccessibilityTcc();
    systemPreferences.isTrustedAccessibilityClient(true);
  }
  return systemPreferences.isTrustedAccessibilityClient(false);
}

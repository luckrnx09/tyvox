import { clipboard, systemPreferences } from "electron";
import { UiohookKey, uIOhook } from "uiohook-napi";
import { isMac } from "../utils/platform";
import { logger } from "../utils/logger";
import { AccessibilityPermissionError, ClipboardError } from "../../shared/types/errors";
import { CLIPBOARD } from "../../shared/limits";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function simulatePaste(): void {
  const modifier = isMac() ? UiohookKey.Meta : UiohookKey.Ctrl;
  uIOhook.keyTap(UiohookKey.V, [modifier]);
}

export class ClipboardService {
  async inject(text: string): Promise<{ success: boolean; retries: number }> {
    if (isMac()) {
      const trusted = systemPreferences.isTrustedAccessibilityClient(true);
      if (!trusted) {
        throw new AccessibilityPermissionError(
          "Accessibility permission is required to inject text. Grant it in System Settings > Privacy & Security > Accessibility.",
        );
      }
    }

    const originalContent = await this.#readClipboardSafely();

    let retries = 0;
    let written = false;

    while (retries < CLIPBOARD.INJECT_RETRY_MAX && !written) {
      try {
        await clipboard.writeText(text);

        const current = await clipboard.readText();
        if (current === text) {
          written = true;
        } else {
          retries++;
          await sleep(CLIPBOARD.INJECT_RETRY_DELAY_MS);
        }
      } catch (error) {
        retries++;
        logger.warn("Clipboard write failed, retrying", {
          attempt: retries,
          error: String(error),
        });
        await sleep(CLIPBOARD.INJECT_RETRY_DELAY_MS);
      }
    }

    if (!written) {
      await this.#restoreClipboard(originalContent);
      throw new ClipboardError(
        `Failed to write to clipboard after ${CLIPBOARD.INJECT_RETRY_MAX} attempts`,
      );
    }

    try {
      simulatePaste();
      await sleep(CLIPBOARD.INJECT_RETRY_DELAY_MS);
    } finally {
      await this.#restoreClipboard(originalContent);
    }

    logger.info("Text injected successfully", { textLength: text.length });
    return { retries, success: true };
  }

  async #restoreClipboard(originalContent: string | null): Promise<void> {
    if (originalContent !== null) {
      try {
        await clipboard.writeText(originalContent);
      } catch (error) {
        logger.warn("Failed to restore clipboard content", { error: String(error) });
      }
    }
  }

  async #readClipboardSafely(): Promise<string | null> {
    try {
      return await clipboard.readText();
    } catch {
      return null;
    }
  }
}

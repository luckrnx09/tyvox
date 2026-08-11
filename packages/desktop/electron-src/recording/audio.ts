import { systemPreferences } from "electron";
import { isMac } from "../utils/platform";
import { logger } from "../utils/logger";

export class AudioCaptureService {
  async selectDevice(deviceId: string): Promise<void> {
    logger.info("Audio device selected", { deviceId });
  }

  async checkPermission(): Promise<boolean> {
    if (isMac()) {
      const status = systemPreferences.getMediaAccessStatus("microphone");
      if (status === "not-determined") {
        const granted = await systemPreferences.askForMediaAccess("microphone");
        return granted;
      }
      return status === "granted";
    }
    return true;
  }
}

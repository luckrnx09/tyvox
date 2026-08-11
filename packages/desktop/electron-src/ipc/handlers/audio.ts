import { registerHandler } from "./router";
import { IPC } from "../../../shared/channels";
import { AudioCaptureService } from "../../recording/audio";

export function registerAudioHandlers(capture: AudioCaptureService): void {
  registerHandler(IPC.GET_MIC_PERMISSION, async () => ({
    granted: await capture.checkPermission(),
    osName: process.platform,
  }));

  registerHandler(IPC.AUDIO_SELECT_DEVICE, async (_event, deviceId: unknown) => {
    await capture.selectDevice(deviceId as string);
  });
}

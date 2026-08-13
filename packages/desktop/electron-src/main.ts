import { BrowserWindow, app, globalShortcut, nativeImage } from "electron";
import { updateUserConfig } from "@tyvox/sdk/client";
import { createCapsuleWindow } from "./ui/windows/capsule";
import { createSettingsWindow } from "./ui/windows/settings";
import { registerAllHandlers, trayService, checkPermissions } from "./ipc";
import { IPC } from "../shared/channels";
import { updaterService } from "./updater";
import { stopBackend } from "./backend";
import { stopUiohook } from "./hotkey";
import { getResourcePath } from "./utils/paths";
import { isMac } from "./utils/platform";
import { logger } from "./utils/logger";

app.setName("Tyvox");

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  const window = BrowserWindow.getAllWindows()[0];
  if (window && !window.isDestroyed()) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
});

let capsuleWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

const getSettingsWindow = (): BrowserWindow | null =>
  settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow : null;

const getCapsuleWindow = (): BrowserWindow | null =>
  capsuleWindow && !capsuleWindow.isDestroyed() ? capsuleWindow : null;

const openSettings = (): void => {
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    settingsWindow = createSettingsWindow();
    settingsWindow.on("close", (event) => {
      event.preventDefault();
      settingsWindow?.hide();
    });
    return;
  }
  settingsWindow.show();
  settingsWindow.focus();
};

const startApp = async (): Promise<void> => {
  if (isMac() && !app.isPackaged) {
    app.dock?.setIcon(nativeImage.createFromPath(getResourcePath("icon.png")));
  }
  capsuleWindow = createCapsuleWindow();

  const initialDeviceId = "default";
  const initialLocale = "en";

  trayService.create({
    onOpenSettings: openSettings,
    onQuit: () => app.quit(),
    microphone: {
      devices: [],
      selectedDeviceId: initialDeviceId,
      onSelect: async (deviceId: string) => {
        try {
          await updateUserConfig({ desktop: { microphone: { deviceId } } });
        } catch (error) {
          logger.error("Failed to save microphone selection", { error: String(error) });
        }
        const window = getCapsuleWindow();
        if (window && !window.isDestroyed()) {
          window.webContents.send(IPC.AUDIO_DEVICE_CHANGED, deviceId);
        }
        trayService.setMicrophoneSelection(deviceId);
      },
    },
  });
  trayService.setLocale(initialLocale);

  registerAllHandlers(getCapsuleWindow, getSettingsWindow, openSettings);
  updaterService.init(getSettingsWindow);
  openSettings();

  const permissions = await checkPermissions();
  const allGranted = permissions.microphone && permissions.accessibility;
  if (!allGranted) {
    const window = getSettingsWindow();
    if (window && !window.isDestroyed()) {
      window.focus();
    }
  }
};

app.whenReady().then(startApp);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) startApp();
  else openSettings();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopUiohook();
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.destroy();
  }
  if (capsuleWindow && !capsuleWindow.isDestroyed()) {
    capsuleWindow.destroy();
  }
  trayService.destroy();
  globalShortcut.unregisterAll();
  stopBackend();
});

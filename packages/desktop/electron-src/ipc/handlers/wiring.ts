import { BrowserWindow, Menu, app, ipcMain, systemPreferences } from "electron";
import { randomUUID } from "node:crypto";
import { UiohookKey, uIOhook } from "uiohook-napi";
import {
  checkASRReadiness,
  checkLLMReadiness,
  postClientLogs,
  setSessionId,
} from "@tyvox/sdk/client";
import { ActionTypeSchema, type ActionType, type DesktopConfig } from "@tyvox/sdk/contracts";
import { AudioCaptureService } from "../../recording/audio";
import { HotkeyService, ensureUiohookStarted } from "../../hotkey/index";
import { ClipboardService } from "../../injection/clipboard";
import { TrayService } from "../../ui/tray";
import { IPC } from "../../../shared/channels";
import type { AudioDevice, HotkeyStartPayload } from "../../../shared/types/ipc";
import { configureDesktopSdk } from "../../../shared/sdk";
import { loadLocalSettings, saveLocalSettings } from "../../settings-store.js";
import type { LocalSettings } from "../../../shared/types/settings.js";
import { registerAudioHandlers } from "./audio";
import { registerSystemHandlers } from "./system";
import { registerCapsuleHandlers } from "./capsule";
import { startBackend, getRuntimeBaseUrl } from "../../backend";
import { logger } from "../../utils/logger";
import { isMac } from "../../utils/platform";

const audioCapture = new AudioCaptureService();
const basicHotkeyService = new HotkeyService();
const translationHotkeyService = new HotkeyService();
const actionHotkeyServices: Record<ActionType, HotkeyService> = {
  basic: basicHotkeyService,
  translate: translationHotkeyService,
};
const clipboardService = new ClipboardService();
const trayService = new TrayService();

export { trayService, basicHotkeyService, translationHotkeyService, audioCapture };

const READINESS_POLL_INTERVAL_MS = 3000;
let readinessPollTimer: ReturnType<typeof setInterval> | null = null;
let lastDesktopConfig: DesktopConfigSubset = {};
let hotkeyRecordingActive = false;
let menuBeforeRecording: Menu | null = null;

export async function checkPermissions(): Promise<{ accessibility: boolean; microphone: boolean }> {
  const microphone = await audioCapture.checkPermission();
  const accessibility = isMac() ? systemPreferences.isTrustedAccessibilityClient(false) : true;
  return { accessibility, microphone };
}

function sendToWindow(window: BrowserWindow | null, channel: string, payload?: unknown): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, payload);
  }
}

function sendToCapsule(
  getCapsuleWindow: () => BrowserWindow | null,
  channel: string,
  payload?: unknown,
): void {
  sendToWindow(getCapsuleWindow(), channel, payload);
}

interface ConfigureHotkeyOptions {
  service: HotkeyService;
  getCapsuleWindow: () => BrowserWindow | null;
  startChannel: string;
  stopChannel: string;
  accelerator: string;
  mode: "ptt" | "toggle";
  action: ActionType;
}

function configureHotkey(options: ConfigureHotkeyOptions): void {
  const { service, getCapsuleWindow, startChannel, stopChannel, accelerator, mode, action } =
    options;
  service.unregister();
  if (!accelerator) return;

  const registered = service.register(
    accelerator,
    mode,
    () => {
      if (hotkeyRecordingActive) return;
      const sessionId = randomUUID();
      setSessionId(sessionId);
      logger.info("Hotkey down", { accelerator, mode, action, sessionId });
      const payload: HotkeyStartPayload = { action, sessionId };
      sendToCapsule(getCapsuleWindow, startChannel, payload);
    },
    mode === "ptt"
      ? () => {
          if (hotkeyRecordingActive) return;
          logger.info("Hotkey up", { accelerator, mode });
          sendToCapsule(getCapsuleWindow, stopChannel);
        }
      : undefined,
  );

  if (!registered) {
    logger.warn("Failed to register hotkey", { accelerator });
  }
}

interface DesktopConfigSubset {
  hotkey?: { mode?: DesktopConfig["hotkey"]["mode"] };
  actions?: Partial<Record<ActionType, { hotkey?: { accelerator?: string } }>>;
  microphone?: { deviceId?: string };
  uiLocale?: DesktopConfig["uiLocale"];
}

function reconfigureHotkeysFromConfig(
  getCapsuleWindow: () => BrowserWindow | null,
  desktop: DesktopConfigSubset,
): void {
  for (const service of Object.values(actionHotkeyServices)) {
    service.unregister();
  }

  const mode = desktop.hotkey?.mode ?? "toggle";

  for (const action of ActionTypeSchema.options) {
    const accelerator = desktop.actions?.[action]?.hotkey?.accelerator;
    if (!accelerator) continue;
    configureHotkey({
      service: actionHotkeyServices[action],
      getCapsuleWindow,
      startChannel: IPC.HOTKEY_START_RECORDING,
      stopChannel: IPC.HOTKEY_STOP_RECORDING,
      accelerator,
      mode,
      action,
    });
  }
}

let escapeWatchStarted = false;

interface ReadinessSummary {
  ready: boolean;
  microphone: boolean;
  accessibility: boolean;
  hotkey: boolean;
  asr: boolean;
  llm: boolean;
}

async function checkAllReadiness(
  desktop: Parameters<typeof reconfigureHotkeysFromConfig>[1],
): Promise<ReadinessSummary> {
  let permissions: { accessibility: boolean; microphone: boolean };
  try {
    permissions = await checkPermissions();
  } catch (error) {
    logger.error("Failed to check permissions", { error: String(error) });
    permissions = { accessibility: false, microphone: false };
  }

  const hotkeyReady = ActionTypeSchema.options.some(
    (action) => desktop.actions?.[action]?.hotkey?.accelerator,
  );

  let asrReady = false;
  let llmReady = false;
  try {
    const [asrResult, llmResult] = await Promise.all([checkASRReadiness(), checkLLMReadiness()]);
    asrReady = asrResult.data.ready;
    llmReady = llmResult.data.ready;
  } catch (error) {
    logger.error("Failed to check backend readiness", { error: String(error) });
  }

  const allReady =
    permissions.microphone && permissions.accessibility && hotkeyReady && asrReady && llmReady;

  return {
    ready: allReady,
    microphone: permissions.microphone,
    accessibility: permissions.accessibility,
    hotkey: hotkeyReady,
    asr: asrReady,
    llm: llmReady,
  };
}

// The capsule window is focusable:false, so its renderer never sees keydown.
// Cancel must come from the global hook. uIOhook only observes — Escape still
// reaches the user's focused app.
function ensureEscapeWatcher(getCapsuleWindow: () => BrowserWindow | null): void {
  if (escapeWatchStarted) return;
  escapeWatchStarted = true;
  uIOhook.on("keydown", (event) => {
    if (event.keycode === UiohookKey.Escape) {
      sendToCapsule(getCapsuleWindow, IPC.CAPSULE_CANCEL);
    }
  });
  try {
    ensureUiohookStarted();
  } catch (error) {
    logger.warn("Failed to start uIOhook for Escape watcher", { error: String(error) });
  }
}

export function registerAllHandlers(
  getCapsuleWindow: () => BrowserWindow | null,
  getSettingsWindow: () => BrowserWindow | null,
  openSettings: () => void,
): void {
  ensureEscapeWatcher(getCapsuleWindow);
  let hotkeysActive = false;
  let readinessCheckInFlight = false;

  async function tryRegisterHotkeys(): Promise<void> {
    if (readinessCheckInFlight) return;
    readinessCheckInFlight = true;
    try {
      const summary = await checkAllReadiness(lastDesktopConfig);
      if (summary.ready) {
        if (readinessPollTimer) {
          clearInterval(readinessPollTimer);
          readinessPollTimer = null;
        }
        reconfigureHotkeysFromConfig(getCapsuleWindow, lastDesktopConfig);
        hotkeysActive = true;
        return;
      }

      hotkeysActive = false;
      for (const service of Object.values(actionHotkeyServices)) {
        service.unregister();
      }

      logger.info("Readiness not complete, deferring hotkey registration", { ...summary });

      const window = getSettingsWindow();
      if (!window || window.isDestroyed()) {
        openSettings();
      } else {
        window.focus();
      }

      if (!readinessPollTimer) {
        readinessPollTimer = setInterval(async () => {
          if (readinessCheckInFlight) return;
          readinessCheckInFlight = true;
          try {
            const latest = await checkAllReadiness(lastDesktopConfig);
            if (latest.ready) {
              logger.info("Readiness complete, registering hotkeys");
              if (readinessPollTimer) {
                clearInterval(readinessPollTimer);
                readinessPollTimer = null;
              }
              reconfigureHotkeysFromConfig(getCapsuleWindow, lastDesktopConfig);
              hotkeysActive = true;
            }
          } finally {
            readinessCheckInFlight = false;
          }
        }, READINESS_POLL_INTERVAL_MS);
      }
    } finally {
      readinessCheckInFlight = false;
    }
  }

  ipcMain.handle(IPC.GET_BACKEND_URL, () => getRuntimeBaseUrl());

  ipcMain.handle(IPC.START_BACKEND, async (_event, settings: LocalSettings) => {
    try {
      const baseUrl = await startBackend(settings);
      configureDesktopSdk(baseUrl);
      return baseUrl;
    } catch (error) {
      if (!settings.useLocalBackend) {
        configureDesktopSdk(settings.serverUrl);
      }
      throw error;
    }
  });

  ipcMain.handle(IPC.LOCAL_SETTINGS_LOAD, () => loadLocalSettings());
  ipcMain.handle(IPC.LOCAL_SETTINGS_SAVE, (_event, settings: LocalSettings) => {
    saveLocalSettings(settings);
    app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
  });

  ipcMain.handle(IPC.AUDIO_DEVICES_SYNC, (_event, devices: AudioDevice[]) => {
    trayService.setMicrophoneDevices(devices);
  });

  ipcMain.handle(IPC.CONFIG_SYNC, (event, desktop) => {
    const previousDeviceId = lastDesktopConfig.microphone?.deviceId;
    lastDesktopConfig = desktop;
    trayService.setLocale(desktop.uiLocale ?? "en");
    if (desktop.microphone?.deviceId) {
      trayService.setMicrophoneSelection(desktop.microphone.deviceId);
      if (desktop.microphone.deviceId !== previousDeviceId) {
        sendToCapsule(getCapsuleWindow, IPC.AUDIO_DEVICE_CHANGED, desktop.microphone.deviceId);
      }
    }
    if (hotkeysActive) {
      reconfigureHotkeysFromConfig(getCapsuleWindow, desktop);
    } else {
      void tryRegisterHotkeys();
    }

    const capsule = getCapsuleWindow();
    const settings = getSettingsWindow();
    sendToWindow(capsule, IPC.CONFIG_CHANGED);
    sendToWindow(settings, IPC.CONFIG_CHANGED);
  });

  ipcMain.on(IPC.LOGS, (_event, payload: unknown) => {
    const entries = Array.isArray(payload) ? payload : [];
    postClientLogs({ entries }).catch(() => {});
  });

  ipcMain.on(IPC.SETTINGS_HOTKEY_RECORDING, (_event, payload: unknown) => {
    const recording =
      typeof payload === "object" && payload !== null && "recording" in payload
        ? (payload as { recording?: unknown }).recording === true
        : false;
    hotkeyRecordingActive = recording;
    if (recording) {
      menuBeforeRecording = Menu.getApplicationMenu();
      Menu.setApplicationMenu(null);
      const settingsWin = getSettingsWindow();
      settingsWin?.once("closed", () => {
        hotkeyRecordingActive = false;
        if (menuBeforeRecording) {
          Menu.setApplicationMenu(menuBeforeRecording);
          menuBeforeRecording = null;
        }
      });
    } else if (menuBeforeRecording) {
      Menu.setApplicationMenu(menuBeforeRecording);
      menuBeforeRecording = null;
    }
  });

  registerAudioHandlers(audioCapture);
  registerSystemHandlers();

  registerCapsuleHandlers(getCapsuleWindow(), getSettingsWindow, openSettings);

  ipcMain.handle(IPC.INJECT_TEXT, async (_event, payload: { text?: string }) => {
    const text = payload?.text;
    if (!text) return;
    try {
      await clipboardService.inject(text);
    } catch (error) {
      logger.error("Text injection failed", { error: String(error) });
    }
  });
}

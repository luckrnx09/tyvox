import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { IPC } from "../shared/channels";

const INVOKE_CHANNELS: ReadonlySet<string> = new Set<string>([
  IPC.GET_MIC_PERMISSION,
  IPC.GET_A11Y_PERMISSION,
  IPC.OPEN_SYSTEM_PREFS,
  IPC.OPEN_ACCESSIBILITY_PREFS,
  IPC.GET_APP_VERSION,
  IPC.GET_BACKEND_URL,
  IPC.GET_PLATFORM,
  IPC.OPEN_SETTINGS,
  IPC.CLOSE_CAPSULE,
  IPC.SHOW_CAPSULE,
  IPC.HIDE_CAPSULE,
  IPC.CAPSULE_SET_IGNORE_MOUSE,
  IPC.WINDOW_MINIMIZE,
  IPC.WINDOW_MAXIMIZE,
  IPC.AUDIO_DEVICES_SYNC,
  IPC.AUDIO_SELECT_DEVICE,
  IPC.INJECT_TEXT,
  IPC.CONFIG_SYNC,
  IPC.LOCAL_SETTINGS_LOAD,
  IPC.LOCAL_SETTINGS_SAVE,
  IPC.START_BACKEND,
  IPC.UPDATE_CHECK,
  IPC.UPDATE_INSTALL,
  IPC.UPDATE_QUIT_INSTALL,
]);

const SEND_CHANNELS: ReadonlySet<string> = new Set<string>([
  IPC.LOGS,
  IPC.SETTINGS_HOTKEY_RECORDING,
]);

const LISTEN_CHANNELS: ReadonlySet<string> = new Set<string>([
  IPC.CAPSULE_CANCEL,
  IPC.CAPSULE_STATE_CHANGE,
  IPC.CAPSULE_TEXT_UPDATE,
  IPC.CONFIG_CHANGED,
  IPC.ON_ERROR,
  IPC.HOTKEY_START_RECORDING,
  IPC.HOTKEY_STOP_RECORDING,
  IPC.AUDIO_DEVICE_CHANGED,
  IPC.UPDATE_STATUS,
]);

function assertAllowedChannel(channel: unknown, allowed: ReadonlySet<string>): void {
  if (typeof channel !== "string" || !allowed.has(channel)) {
    throw new Error(`IPC channel not allowed: ${String(channel)}`);
  }
}

import type { ElectronAPI } from "../shared/types/ipc";

const electronAPI: ElectronAPI = {
  invoke: <T>(channel: string, ...args: unknown[]): Promise<T> => {
    assertAllowedChannel(channel, INVOKE_CHANNELS);
    return ipcRenderer.invoke(channel, ...args);
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    assertAllowedChannel(channel, LISTEN_CHANNELS);
    const listener = (_event: IpcRendererEvent, ...args: unknown[]): void => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  send: (channel: string, ...args: unknown[]) => {
    assertAllowedChannel(channel, SEND_CHANNELS);
    ipcRenderer.send(channel, ...args);
  },
};

contextBridge.exposeInMainWorld("electron", electronAPI);

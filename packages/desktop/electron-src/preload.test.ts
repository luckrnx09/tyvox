// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { IPC } from "../shared/channels";
import type { ElectronAPI } from "../shared/types/ipc";

const exposed: { api?: ElectronAPI } = {};

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn((key: string, api: ElectronAPI) => {
      if (key === "electron") exposed.api = api;
    }),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    removeListener: vi.fn(),
    send: vi.fn(),
  },
}));

await import("./preload");

describe("preload channel allowlists", () => {
  it("exposes the electron api", () => {
    expect(exposed.api).toBeDefined();
  });

  it("allows listening to every main-to-renderer channel", () => {
    const listenChannels = [
      IPC.CAPSULE_CANCEL,
      IPC.CAPSULE_STATE_CHANGE,
      IPC.CAPSULE_TEXT_UPDATE,
      IPC.ON_ERROR,
      IPC.HOTKEY_START_RECORDING,
      IPC.HOTKEY_STOP_RECORDING,
      IPC.AUDIO_DEVICE_CHANGED,
      IPC.UPDATE_STATUS,
    ];
    for (const channel of listenChannels) {
      expect(() => exposed.api!.on(channel, () => {}), channel).not.toThrow();
    }
  });

  it("rejects unknown channels", () => {
    expect(() => exposed.api!.on("evil:channel", () => {})).toThrow("IPC channel not allowed");
  });
});

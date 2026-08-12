import { describe, expect, it } from "vitest";
import { IPC } from "./channels";

describe("IPC channels", () => {
  it("has all required capsule channels", () => {
    expect(IPC.CAPSULE_STATE_CHANGE).toBe("capsule:state-change");
    expect(IPC.CAPSULE_TEXT_UPDATE).toBe("capsule:text-update");
  });

  it("has all required system channels", () => {
    expect(IPC.GET_MIC_PERMISSION).toBe("system:mic-permission");
    expect(IPC.GET_A11Y_PERMISSION).toBe("system:a11y-permission");
    expect(IPC.OPEN_SYSTEM_PREFS).toBe("system:open-prefs");
    expect(IPC.OPEN_ACCESSIBILITY_PREFS).toBe("system:open-accessibility-prefs");
    expect(IPC.GET_APP_VERSION).toBe("system:app-version");
    expect(IPC.GET_BACKEND_URL).toBe("system:backend-url");
    expect(IPC.GET_PLATFORM).toBe("system:platform");
  });

  it("has all required window channels", () => {
    expect(IPC.OPEN_SETTINGS).toBe("window:open-settings");
    expect(IPC.CLOSE_CAPSULE).toBe("window:close-capsule");
    expect(IPC.SHOW_CAPSULE).toBe("window:show-capsule");
    expect(IPC.HIDE_CAPSULE).toBe("window:hide-capsule");
  });

  it("has audio device channels", () => {
    expect(IPC.AUDIO_DEVICES_SYNC).toBe("audio:devices-sync");
    expect(IPC.AUDIO_SELECT_DEVICE).toBe("audio:select-device");
    expect(IPC.AUDIO_DEVICE_CHANGED).toBe("audio:device-changed");
  });

  it("has error event channel", () => {
    expect(IPC.ON_ERROR).toBe("app:error");
  });

  it("has client logs channel", () => {
    expect(IPC.LOGS).toBe("logs:client");
  });

  it("has config sync channel", () => {
    expect(IPC.CONFIG_SYNC).toBe("config:sync");
  });

  it("all channel values are unique", () => {
    const values = Object.values(IPC);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("all channel values follow colon-separated convention", () => {
    const values = Object.values(IPC);
    for (const v of values) {
      expect(v).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/);
    }
  });

  it("has config changed channel", () => {
    expect(IPC.CONFIG_CHANGED).toBe("config:changed");
  });

  it("has local settings channels", () => {
    expect(IPC.LOCAL_SETTINGS_LOAD).toBe("local-settings:load");
    expect(IPC.LOCAL_SETTINGS_SAVE).toBe("local-settings:save");
  });

  it("has backend start channel", () => {
    expect(IPC.START_BACKEND).toBe("backend:start");
  });

  it("total channel count is 36", () => {
    expect(Object.keys(IPC).length).toBe(36);
  });
});

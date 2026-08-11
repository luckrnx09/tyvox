import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { unlinkSync, existsSync } from "node:fs";
import { loadLocalSettings, saveLocalSettings } from "./settings-store.js";

const mockPath = "/tmp/settings.json";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/tmp"),
  },
}));

describe("settings-store", () => {
  beforeEach(() => {
    if (existsSync(mockPath)) unlinkSync(mockPath);
  });

  afterEach(() => {
    if (existsSync(mockPath)) unlinkSync(mockPath);
  });

  it("returns defaults when file does not exist", () => {
    const settings = loadLocalSettings();
    expect(settings.useLocalBackend).toBe(true);
    expect(settings.serverUrl).toBe("http://127.0.0.1:23456");
  });

  it("persists and loads custom settings", () => {
    saveLocalSettings({ useLocalBackend: false, serverUrl: "http://192.168.1.10:23456" });
    const settings = loadLocalSettings();
    expect(settings.useLocalBackend).toBe(false);
    expect(settings.serverUrl).toBe("http://192.168.1.10:23456");
  });
});

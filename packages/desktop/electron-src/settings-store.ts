import { app } from "electron";
import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { DEFAULT_BASE_URL } from "@tyvox/sdk/constants";
import type { LocalSettings } from "../shared/types/settings.js";

const SETTINGS_FILE_NAME = "settings.json";

function getSettingsPath(): string {
  return join(app.getPath("userData"), SETTINGS_FILE_NAME);
}

export function loadLocalSettings(): LocalSettings {
  const path = getSettingsPath();
  if (!existsSync(path)) {
    return { launchAtLogin: false, useLocalBackend: true, serverUrl: DEFAULT_BASE_URL };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as Partial<LocalSettings>;
    return {
      launchAtLogin: parsed.launchAtLogin ?? false,
      useLocalBackend: parsed.useLocalBackend ?? true,
      serverUrl: parsed.serverUrl || DEFAULT_BASE_URL,
    };
  } catch {
    return { launchAtLogin: false, useLocalBackend: true, serverUrl: DEFAULT_BASE_URL };
  }
}

export function saveLocalSettings(settings: LocalSettings): void {
  const path = getSettingsPath();
  writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8");
}

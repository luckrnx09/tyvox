import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { UserConfigSchema, type UserConfig } from "@tyvox/sdk/contracts";
import type { UserConfigRepository } from "./types.js";
import { isFileMissing, writeFileAtomic } from "./fs.js";

const CONFIG_FILE = "config.json";

export const DEFAULT_CONFIG: UserConfig = {
  version: 1,
  desktop: {
    hotkey: { mode: "toggle" },
    actions: {
      basic: { hotkey: { accelerator: "AltRight" } },
      translate: {
        hotkey: { accelerator: "Alt+Shift" },
        payload: { target: "English" },
      },
    },
    microphone: { deviceId: "default" },
    uiLocale: "en",
  },
  llm: {
    provider: "ollama",
    apiKey: "",
    baseUrl: "http://localhost:11434/v1",
    model: "qwen3:latest",
    tone: "professional",
    thinkingEnabled: false,
  },
  speech: {
    provider: "whisper:small",
    languages: [],
  },
};

export function createFileUserConfigRepository(usersRoot: string): UserConfigRepository {
  function filePath(userId: string): string {
    return join(usersRoot, userId, CONFIG_FILE);
  }

  return {
    async read(userId) {
      try {
        const raw = await readFile(filePath(userId), "utf8");
        return UserConfigSchema.parse(JSON.parse(raw));
      } catch (error) {
        if (isFileMissing(error)) return structuredClone(DEFAULT_CONFIG);
        throw error;
      }
    },

    async write(userId, config) {
      const validated = UserConfigSchema.parse(config);
      await writeFileAtomic(filePath(userId), JSON.stringify(validated, null, 2));
    },
  };
}

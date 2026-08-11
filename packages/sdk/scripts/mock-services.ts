import { UserConfigSchema } from "../contracts/index.js";
import type { Services } from "../server/index.js";

const mockConfig = {
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
    baseUrl: "",
    model: "",
    maxTokens: 1024,
    temperature: 0.5,
    timeoutSec: 30,
    tone: "professional",
  },
  speech: { provider: "whisper:small", languages: [] },
} as const;

export const mockServices: Services = {
  transcribeService: {
    sendChunk: async () => ({ receivedBytes: 0 }),
    finalize: async () => ({ text: "", durationMs: 0 }),
  },
  vocabularyService: {
    get: async () => ({ vocabulary: {} }),
    clear: async () => {},
    add: async () => {},
    delete: async () => {},
    rename: async () => {},
  },
  userConfigService: {
    get: async () => UserConfigSchema.parse(mockConfig),
    update: async (_, partial) => UserConfigSchema.parse({ ...mockConfig, ...partial }),
  },
  transformService: {
    run: async () => {
      async function* gen() {
        yield "";
      }
      return gen();
    },
  },
  asrService: {
    listModels: async () => [],
    prepareModel: () => {},
    checkReadiness: async () => ({ ready: true }),
  },
  clientLogService: {
    write: async () => {},
  },
  llmProviderService: {
    listProviders: async () => [],
    checkReadiness: async () => ({ ready: true }),
  },
};

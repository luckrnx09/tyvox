import { expect, it } from "vitest";
import {
  ActionTypeSchema,
  LLMConfigSchema,
  TransformTextInputSchema,
  UserConfigPartialSchema,
  UserConfigSchema,
} from "./index.js";

const baseConfig = {
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
    provider: "openai",
    apiKey: "",
    baseUrl: "",
    model: "",
    tone: "professional",
  },
  speech: { provider: "whisper:small", languages: [] },
} as const;

it("user config round-trips the full shape", () => {
  const parsed = UserConfigSchema.parse(baseConfig);
  expect(parsed.desktop.actions.translate.payload.target).toBe("English");
  expect(parsed.llm.tone).toBe("professional");
  expect(parsed.speech.provider).toBe("whisper:small");
});

it("action type covers every configured action", () => {
  expect(ActionTypeSchema.options).toEqual(["basic", "translate"]);
});

it("llm provider is required and must be a known provider", () => {
  const withoutProvider = { ...baseConfig, llm: { ...baseConfig.llm, provider: undefined } };
  expect(UserConfigSchema.safeParse(withoutProvider).success).toBe(false);
  const withUnknownProvider = { ...baseConfig, llm: { ...baseConfig.llm, provider: "bogus" } };
  expect(UserConfigSchema.safeParse(withUnknownProvider).success).toBe(false);
});

it("user config partial accepts nested updates at any depth", () => {
  expect(UserConfigPartialSchema.safeParse({ llm: { tone: "casual" } }).success).toBe(true);
  expect(UserConfigPartialSchema.safeParse({ desktop: { hotkey: { mode: "ptt" } } }).success).toBe(
    true,
  );
  expect(
    UserConfigPartialSchema.safeParse({ desktop: { actions: { basic: { hotkey: {} } } } }).success,
  ).toBe(true);
});

it("user config partial rejects invalid nested values", () => {
  expect(UserConfigPartialSchema.safeParse({ llm: { tone: "loud" } }).success).toBe(false);
  expect(UserConfigPartialSchema.safeParse({ desktop: { hotkey: { mode: "hold" } } }).success).toBe(
    false,
  );
});

it("transform input carries enrich option payloads", () => {
  const parsed = TransformTextInputSchema.parse({
    text: "hello",
    enrichOptions: [{ type: "translate", payload: { target: "English" } }],
  });
  expect(parsed.enrichOptions[0]).toEqual({
    type: "translate",
    payload: { target: "English" },
  });
});

it("transform input accepts an optional timeoutScale", () => {
  const parsed = TransformTextInputSchema.parse({
    text: "hello",
    enrichOptions: [],
    timeoutScale: 3,
  });
  expect(parsed.timeoutScale).toBe(3);
});

it("transform input rejects out-of-range timeoutScale", () => {
  expect(
    TransformTextInputSchema.safeParse({
      text: "hello",
      enrichOptions: [],
      timeoutScale: 0,
    }).success,
  ).toBe(false);
  expect(
    TransformTextInputSchema.safeParse({
      text: "hello",
      enrichOptions: [],
      timeoutScale: 6,
    }).success,
  ).toBe(false);
});

it("accepts thinkingEnabled and extraBody", () => {
  const config = LLMConfigSchema.parse({
    provider: "deepseek",
    apiKey: "k",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-v4-flash",
    tone: "professional",
    thinkingEnabled: true,
    extraBody: '{"foo":1}',
  });
  expect(config.thinkingEnabled).toBe(true);
  expect(config.extraBody).toBe('{"foo":1}');
});

it("defaults thinkingEnabled to false and ignores removed legacy fields", () => {
  const config = LLMConfigSchema.parse({
    provider: "ollama",
    apiKey: "",
    baseUrl: "http://localhost:11434/v1",
    model: "qwen3:latest",
    tone: "professional",
    maxTokens: 4096,
    temperature: 0.3,
    timeoutSec: 15,
  });
  expect(config.thinkingEnabled).toBe(false);
  expect("maxTokens" in config).toBe(false);
});

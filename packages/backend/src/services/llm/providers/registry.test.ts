import { describe, expect, it } from "vitest";
import { LLMProviderSchema } from "@tyvox/sdk/contracts";
import { LLM_PROVIDER_REGISTRY, getLLMProviders, resolveStrategy } from "./registry.js";

describe("LLM_PROVIDER_REGISTRY", () => {
  it("covers every provider in the contract enum", () => {
    for (const id of LLMProviderSchema.options) {
      expect(LLM_PROVIDER_REGISTRY[id].id).toBe(id);
    }
  });

  it("exposes provider info for the settings UI", () => {
    const providers = getLLMProviders();
    expect(providers.find((p) => p.id === "deepseek")?.defaultBaseUrl).toBe(
      "https://api.deepseek.com/v1",
    );
    expect(providers).toHaveLength(LLMProviderSchema.options.length);
  });
});

describe("thinkingBody", () => {
  it.each([
    ["deepseek", "any-model", false, { thinking: { type: "disabled" } }],
    ["deepseek", "any-model", true, { thinking: { type: "enabled" } }],
    ["minimax", "any-model", false, { thinking: { type: "disabled" } }],
    ["minimax", "any-model", true, { thinking: { type: "adaptive" } }],
    ["dashscope", "any-model", false, { enable_thinking: false }],
    ["dashscope", "any-model", true, { enable_thinking: true }],
    ["openrouter", "any-model", false, { reasoning: { effort: "none", exclude: true } }],
    ["openrouter", "any-model", true, { reasoning: { effort: "medium", exclude: true } }],
    ["stepfun", "any-model", false, { reasoning_effort: "low" }],
    ["stepfun", "any-model", true, { reasoning_effort: "medium" }],
    ["ollama", "any-model", false, { think: false, reasoning_effort: "none" }],
    ["ollama", "any-model", true, { think: true, reasoning_effort: "medium" }],
    ["ark", "doubao-seed-2-xxx", false, { reasoning: { effort: "minimal" } }],
    ["ark", "doubao-seed-2-xxx", true, { reasoning: { effort: "medium" } }],
    ["ark", "doubao-seed-evolving", false, { reasoning: { effort: "minimal" } }],
    ["ark", "doubao-seed-1-8", false, { reasoning: { effort: "minimal" } }],
    ["ark", "glm-5-xxx", false, { reasoning: { effort: "minimal" } }],
    ["ark", "other-model", false, { thinking: { type: "disabled" } }],
    ["ark", "other-model", true, { thinking: { type: "enabled" } }],
    ["siliconflow", "GLM-5", true, { enable_thinking: true }],
    ["siliconflow", "Pro/GLM-5", false, { enable_thinking: false }],
    ["siliconflow", "deepseek-ai/DeepSeek-V3.2", true, { enable_thinking: true }],
    ["siliconflow", "tencent/Hunyuan-A13B-Instruct", true, { enable_thinking: true }],
    ["siliconflow", "Qwen/Qwen3-8B", true, { enable_thinking: true }],
    ["siliconflow", "llama-4", false, null],
    ["siliconflow", "Qwen/Qwen3-8B-Instruct", true, null],
    ["zhipu", "any-model", false, { thinking: { type: "disabled" } }],
    ["zhipu", "any-model", true, { thinking: { type: "enabled" } }],
    ["moonshot", "kimi-k3-xxx", false, { reasoning_effort: "low" }],
    ["moonshot", "kimi-k3-xxx", true, { reasoning_effort: "high" }],
    ["moonshot", "kimi-k2.7-code", false, null],
    ["moonshot", "kimi-k2.7-code", true, null],
    ["moonshot", "kimi-k2.5", false, { thinking: { type: "disabled" } }],
    ["moonshot", "kimi-k2.5", true, { thinking: { type: "enabled" } }],
    ["moonshot", "kimi-k2.6", false, { thinking: { type: "disabled" } }],
    ["moonshot", "kimi-k2.6", true, { thinking: { type: "enabled" } }],
    ["moonshot", "kimi-lite", false, null],
    ["moonshot", "kimi-lite", true, null],
    ["gemini", "gemini-2.5-pro-preview", false, { reasoning_effort: "low" }],
    ["gemini", "gemini-2.5-pro-preview", true, { reasoning_effort: "medium" }],
    ["gemini", "gemini-3-xxx", false, { reasoning_effort: "low" }],
    ["gemini", "gemini-3-xxx", true, { reasoning_effort: "medium" }],
    ["gemini", "gemini-2.0-flash", false, { reasoning_effort: "none" }],
    ["gemini", "gemini-2.0-flash", true, { reasoning_effort: "low" }],
    ["groq", "qwen3-32b", false, { reasoning_effort: "none" }],
    ["groq", "qwen3-32b", true, { reasoning_effort: "default" }],
    ["groq", "gpt-oss-120b", false, { reasoning_effort: "low" }],
    ["groq", "gpt-oss-120b", true, { reasoning_effort: "medium" }],
    ["groq", "llama-4", false, null],
    ["groq", "llama-4", true, null],
  ] as const)("%s %s with enabled=%s injects %j", (id, model, enabled, expected) => {
    expect(LLM_PROVIDER_REGISTRY[id].thinkingBody({ model, enabled })).toEqual(expected);
  });
});

describe("resolveStrategy", () => {
  it("returns the registry entry for known providers", () => {
    expect(resolveStrategy("deepseek", "https://api.deepseek.com/v1").id).toBe("deepseek");
  });

  it.each([
    ["https://my-gateway.com/deepseek-proxy/v1", "deepseek"],
    ["https://api.MINIMAXI.com/v1", "minimax"],
    ["https://openrouter.example.com/v1", "openrouter"],
    ["https://dashscope.aliyuncs.com/compatible-mode/v1", "dashscope"],
    ["https://custom.aliyuncs.com/v1", "dashscope"],
    ["https://stepfun.internal/v1", "stepfun"],
  ] as const)("infers %s as %s", (baseUrl, expectedId) => {
    expect(resolveStrategy("custom", baseUrl).id).toBe(expectedId);
  });

  it("falls back to the inert custom strategy when nothing matches", () => {
    const strategy = resolveStrategy("custom", "https://unknown.example.com/v1");
    expect(strategy.id).toBe("custom");
    expect(strategy.thinkingBody({ model: "m", enabled: false })).toBeNull();
  });
});

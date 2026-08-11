import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const SILICONFLOW_ID = "siliconflow" as const;
const SILICONFLOW_NAME = "SiliconFlow";
const SILICONFLOW_DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1";
const ENABLE_THINKING_KEY = "enable_thinking";
const ORG_PREFIXES = ["Pro/", "zai-org/", "deepseek-ai/", "tencent/", "Qwen/"] as const;
const WHITELISTED_MODELS = [
  "GLM-5",
  "GLM-4.7",
  "DeepSeek-V3.2",
  "GLM-4.6",
  "Qwen3-8B",
  "Qwen3-14B",
  "Qwen3-32B",
  "Qwen3-30B-A3B",
  "Hunyuan-A13B-Instruct",
  "GLM-4.5V",
  "DeepSeek-V3.1-Terminus",
  "Qwen3.5-397B-A17B",
  "Qwen3.5-122B-A10B",
  "Qwen3.5-35B-A3B",
  "Qwen3.5-27B",
  "Qwen3.5-9B",
  "Qwen3.5-4B",
] as const;

function normalizeModel(model: string): string {
  return model.trim().toLowerCase();
}

function stripOrgPrefix(model: string): string {
  for (const prefix of ORG_PREFIXES) {
    const lowerPrefix = prefix.toLowerCase();
    if (model.startsWith(lowerPrefix)) {
      return model.slice(lowerPrefix.length);
    }
  }
  return model;
}

const LOWERCASED_WHITELIST = WHITELISTED_MODELS.map((model) => model.toLowerCase());

export class SiliconFlowStrategy extends LLMProviderStrategy {
  readonly id = SILICONFLOW_ID;
  readonly name = SILICONFLOW_NAME;
  readonly defaultBaseUrl = SILICONFLOW_DEFAULT_BASE_URL;

  thinkingBody({ model, enabled }: ThinkingBodyContext): Record<string, unknown> | null {
    const normalized = normalizeModel(model);
    const stripped = stripOrgPrefix(normalized);
    if (LOWERCASED_WHITELIST.some((candidate) => stripped.endsWith(candidate))) {
      return { [ENABLE_THINKING_KEY]: enabled };
    }
    return null;
  }
}

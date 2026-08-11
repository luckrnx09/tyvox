import type { LLMProvider, LLMProviderInfo } from "@tyvox/sdk/contracts";
import type { LLMProviderStrategy } from "./base.js";
import { ArkStrategy } from "./ark.js";
import { CustomProviderStrategy } from "./custom.js";
import { DashScopeStrategy } from "./dashscope.js";
import { DeepSeekStrategy } from "./deepseek.js";
import { GeminiStrategy } from "./gemini.js";
import { GroqStrategy } from "./groq.js";
import { MiniMaxStrategy } from "./minimax.js";
import { MoonshotStrategy } from "./moonshot.js";
import { OllamaStrategy } from "./ollama.js";
import { OpenAIStrategy } from "./openai.js";
import { OpenRouterStrategy } from "./openrouter.js";
import { SiliconFlowStrategy } from "./siliconflow.js";
import { StepFunStrategy } from "./stepfun.js";
import { ZhipuStrategy } from "./zhipu.js";

export const LLM_PROVIDER_REGISTRY: Record<LLMProvider, LLMProviderStrategy> = {
  ark: new ArkStrategy(),
  deepseek: new DeepSeekStrategy(),
  siliconflow: new SiliconFlowStrategy(),
  openai: new OpenAIStrategy(),
  openrouter: new OpenRouterStrategy(),
  minimax: new MiniMaxStrategy(),
  stepfun: new StepFunStrategy(),
  dashscope: new DashScopeStrategy(),
  zhipu: new ZhipuStrategy(),
  moonshot: new MoonshotStrategy(),
  ollama: new OllamaStrategy(),
  gemini: new GeminiStrategy(),
  groq: new GroqStrategy(),
  custom: new CustomProviderStrategy(),
};

const URL_STRATEGY_HINTS: ReadonlyArray<readonly [string, LLMProvider]> = [
  ["minimax", "minimax"],
  ["deepseek", "deepseek"],
  ["openrouter", "openrouter"],
  ["dashscope", "dashscope"],
  ["aliyuncs", "dashscope"],
  ["stepfun", "stepfun"],
];

function urlHintOf(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return `${url.hostname}${url.pathname}`.toLowerCase();
  } catch {
    return "";
  }
}

export function resolveStrategy(provider: LLMProvider, baseUrl: string): LLMProviderStrategy {
  if (provider !== "custom") return LLM_PROVIDER_REGISTRY[provider];
  const hintTarget = urlHintOf(baseUrl);
  const hint = URL_STRATEGY_HINTS.find(([keyword]) => hintTarget.includes(keyword));
  return hint ? LLM_PROVIDER_REGISTRY[hint[1]] : LLM_PROVIDER_REGISTRY.custom;
}

export function getLLMProviders(): LLMProviderInfo[] {
  return Object.values(LLM_PROVIDER_REGISTRY).map((s) => ({
    id: s.id,
    name: s.name,
    defaultBaseUrl: s.defaultBaseUrl,
  }));
}

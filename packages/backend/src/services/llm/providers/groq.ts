import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const GROQ_ID = "groq" as const;
const GROQ_NAME = "Groq";
const GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const QWEN3_SUBSTRING = "qwen3";
const GPT_OSS_SUBSTRING = "gpt-oss";
const REASONING_EFFORT_KEY = "reasoning_effort";
const REASONING_EFFORT_NONE = "none";
const REASONING_EFFORT_DEFAULT = "default";
const REASONING_EFFORT_LOW = "low";
const REASONING_EFFORT_MEDIUM = "medium";

function normalizeModel(model: string): string {
  return model.trim().toLowerCase();
}

export class GroqStrategy extends LLMProviderStrategy {
  readonly id = GROQ_ID;
  readonly name = GROQ_NAME;
  readonly defaultBaseUrl = GROQ_DEFAULT_BASE_URL;

  thinkingBody({ model, enabled }: ThinkingBodyContext): Record<string, unknown> | null {
    const normalized = normalizeModel(model);
    if (normalized.includes(QWEN3_SUBSTRING)) {
      return { [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_DEFAULT : REASONING_EFFORT_NONE };
    }
    if (normalized.includes(GPT_OSS_SUBSTRING)) {
      return { [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_MEDIUM : REASONING_EFFORT_LOW };
    }
    return null;
  }
}

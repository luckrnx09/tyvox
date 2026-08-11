import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const GEMINI_ID = "gemini" as const;
const GEMINI_NAME = "Gemini";
const GEMINI_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const REASONING_EFFORT_KEY = "reasoning_effort";
const REASONING_EFFORT_NONE = "none";
const REASONING_EFFORT_LOW = "low";
const REASONING_EFFORT_MEDIUM = "medium";
const GEMINI_2_5_PRO_SUBSTRING = "2.5-pro";
const GEMINI_3_PREFIX = "gemini-3";

function normalizeModel(model: string): string {
  return model.trim().toLowerCase();
}

export class GeminiStrategy extends LLMProviderStrategy {
  readonly id = GEMINI_ID;
  readonly name = GEMINI_NAME;
  readonly defaultBaseUrl = GEMINI_DEFAULT_BASE_URL;

  thinkingBody({ model, enabled }: ThinkingBodyContext): Record<string, unknown> {
    const normalized = normalizeModel(model);
    if (normalized.includes(GEMINI_2_5_PRO_SUBSTRING) || normalized.startsWith(GEMINI_3_PREFIX)) {
      return { [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_MEDIUM : REASONING_EFFORT_LOW };
    }
    return { [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_LOW : REASONING_EFFORT_NONE };
  }
}

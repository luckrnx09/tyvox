import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const OPENAI_MODEL_PREFIX = "openai/";
const GPT5_PRO_PREFIX = "gpt-5-pro";
const GPT5_PREFIX = "gpt-5";
const REASONING_MODEL_PREFIXES = ["o1", "o3", "o4"] as const;
const REASONING_EFFORT_KEY = "reasoning_effort";
const REASONING_EFFORT_HIGH = "high";
const REASONING_EFFORT_MEDIUM = "medium";
const REASONING_EFFORT_LOW = "low";
const REASONING_EFFORT_MINIMAL = "minimal";
const REASONING_EFFORT_NONE = "none";
const GPT5_DOT_PATTERN = /^gpt-5\.\d/;

function normalizeModel(model: string): string {
  const trimmed = model.trim();
  const withoutVendor = trimmed.startsWith(OPENAI_MODEL_PREFIX)
    ? trimmed.slice(OPENAI_MODEL_PREFIX.length)
    : trimmed;
  return withoutVendor.toLowerCase();
}

function isReasoningModel(normalized: string): boolean {
  return REASONING_MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export class OpenAIStrategy extends LLMProviderStrategy {
  readonly id = "openai" as const;
  readonly name = "OpenAI";
  readonly defaultBaseUrl = "https://api.openai.com/v1";

  thinkingBody({ model, enabled }: ThinkingBodyContext): Record<string, unknown> | null {
    const normalized = normalizeModel(model);
    if (normalized.startsWith(GPT5_PRO_PREFIX)) {
      return { [REASONING_EFFORT_KEY]: REASONING_EFFORT_HIGH };
    }
    if (GPT5_DOT_PATTERN.test(normalized)) {
      return { [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_MEDIUM : REASONING_EFFORT_NONE };
    }
    if (normalized.startsWith(GPT5_PREFIX)) {
      return {
        [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_MEDIUM : REASONING_EFFORT_MINIMAL,
      };
    }
    if (isReasoningModel(normalized)) {
      return { [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_MEDIUM : REASONING_EFFORT_LOW };
    }
    return null;
  }

  customizeBody(body: Record<string, unknown>, model: string): void {
    const normalized = normalizeModel(model);
    if (normalized.startsWith(GPT5_PREFIX) || isReasoningModel(normalized)) {
      delete body.temperature;
    }
  }
}

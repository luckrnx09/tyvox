import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const OPENROUTER_ID = "openrouter" as const;
const OPENROUTER_NAME = "OpenRouter";
const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const REASONING_KEY = "reasoning";
const REASONING_EXCLUDE_KEY = "exclude";
const REASONING_EFFORT_NONE = "none";
const REASONING_EFFORT_MEDIUM = "medium";

export class OpenRouterStrategy extends LLMProviderStrategy {
  readonly id = OPENROUTER_ID;
  readonly name = OPENROUTER_NAME;
  readonly defaultBaseUrl = OPENROUTER_DEFAULT_BASE_URL;

  thinkingBody({ enabled }: ThinkingBodyContext): Record<string, unknown> {
    return {
      [REASONING_KEY]: {
        effort: enabled ? REASONING_EFFORT_MEDIUM : REASONING_EFFORT_NONE,
        [REASONING_EXCLUDE_KEY]: true,
      },
    };
  }
}

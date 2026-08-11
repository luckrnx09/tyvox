import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const OLLAMA_ID = "ollama" as const;
const OLLAMA_NAME = "Ollama";
const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434/v1";
const THINK_KEY = "think";
const REASONING_EFFORT_KEY = "reasoning_effort";
const REASONING_EFFORT_NONE = "none";
const REASONING_EFFORT_MEDIUM = "medium";

export class OllamaStrategy extends LLMProviderStrategy {
  readonly id = OLLAMA_ID;
  readonly name = OLLAMA_NAME;
  readonly defaultBaseUrl = OLLAMA_DEFAULT_BASE_URL;
  readonly requiresApiKey = false;

  thinkingBody({ enabled }: ThinkingBodyContext): Record<string, unknown> {
    return {
      [THINK_KEY]: enabled,
      [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_MEDIUM : REASONING_EFFORT_NONE,
    };
  }
}

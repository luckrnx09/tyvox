import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const DEEPSEEK_ID = "deepseek" as const;
const DEEPSEEK_NAME = "DeepSeek";
const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com/v1";
const THINKING_TYPE_ENABLED = "enabled";
const THINKING_TYPE_DISABLED = "disabled";

export class DeepSeekStrategy extends LLMProviderStrategy {
  readonly id = DEEPSEEK_ID;
  readonly name = DEEPSEEK_NAME;
  readonly defaultBaseUrl = DEEPSEEK_DEFAULT_BASE_URL;

  thinkingBody({ enabled }: ThinkingBodyContext): Record<string, unknown> {
    return { thinking: { type: enabled ? THINKING_TYPE_ENABLED : THINKING_TYPE_DISABLED } };
  }
}

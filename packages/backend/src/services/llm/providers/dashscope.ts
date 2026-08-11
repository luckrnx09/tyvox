import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const DASHSCOPE_ID = "dashscope" as const;
const DASHSCOPE_NAME = "DashScope";
const DASHSCOPE_DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const ENABLE_THINKING_KEY = "enable_thinking";

export class DashScopeStrategy extends LLMProviderStrategy {
  readonly id = DASHSCOPE_ID;
  readonly name = DASHSCOPE_NAME;
  readonly defaultBaseUrl = DASHSCOPE_DEFAULT_BASE_URL;

  thinkingBody({ enabled }: ThinkingBodyContext): Record<string, unknown> {
    return { [ENABLE_THINKING_KEY]: enabled };
  }
}

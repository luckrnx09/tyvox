import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const ZHIPU_ID = "zhipu" as const;
const ZHIPU_NAME = "智谱 (Zhipu)";
const ZHIPU_DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const THINKING_KEY = "thinking";
const THINKING_TYPE_ENABLED = "enabled";
const THINKING_TYPE_DISABLED = "disabled";

export class ZhipuStrategy extends LLMProviderStrategy {
  readonly id = ZHIPU_ID;
  readonly name = ZHIPU_NAME;
  readonly defaultBaseUrl = ZHIPU_DEFAULT_BASE_URL;

  thinkingBody({ enabled }: ThinkingBodyContext): Record<string, unknown> {
    return { [THINKING_KEY]: { type: enabled ? THINKING_TYPE_ENABLED : THINKING_TYPE_DISABLED } };
  }
}

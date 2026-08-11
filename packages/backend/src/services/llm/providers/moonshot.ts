import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const MOONSHOT_ID = "moonshot" as const;
const MOONSHOT_NAME = "Moonshot";
const MOONSHOT_DEFAULT_BASE_URL = "https://api.moonshot.cn/v1";
const KIMI_K3_PREFIX = "kimi-k3";
const KIMI_K2_7_CODE_PREFIX = "kimi-k2.7-code";
const KIMI_K2_5_PREFIX = "kimi-k2.5";
const KIMI_K2_6_PREFIX = "kimi-k2.6";
const REASONING_EFFORT_KEY = "reasoning_effort";
const REASONING_EFFORT_LOW = "low";
const REASONING_EFFORT_HIGH = "high";
const THINKING_KEY = "thinking";
const THINKING_TYPE_ENABLED = "enabled";
const THINKING_TYPE_DISABLED = "disabled";

function normalizeModel(model: string): string {
  return model.trim().toLowerCase();
}

export class MoonshotStrategy extends LLMProviderStrategy {
  readonly id = MOONSHOT_ID;
  readonly name = MOONSHOT_NAME;
  readonly defaultBaseUrl = MOONSHOT_DEFAULT_BASE_URL;

  thinkingBody({ model, enabled }: ThinkingBodyContext): Record<string, unknown> | null {
    const normalized = normalizeModel(model);
    if (normalized.startsWith(KIMI_K3_PREFIX)) {
      return { [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_HIGH : REASONING_EFFORT_LOW };
    }
    if (normalized.startsWith(KIMI_K2_7_CODE_PREFIX)) {
      return null;
    }
    if (normalized.startsWith(KIMI_K2_5_PREFIX) || normalized.startsWith(KIMI_K2_6_PREFIX)) {
      return { [THINKING_KEY]: { type: enabled ? THINKING_TYPE_ENABLED : THINKING_TYPE_DISABLED } };
    }
    return null;
  }
}

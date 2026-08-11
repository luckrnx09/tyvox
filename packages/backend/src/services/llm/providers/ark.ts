import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const ARK_ID = "ark" as const;
const ARK_NAME = "火山引擎 (Ark)";
const ARK_DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const REASONING_KEY = "reasoning";
const REASONING_EFFORT_KEY = "effort";
const REASONING_EFFORT_MEDIUM = "medium";
const REASONING_EFFORT_MINIMAL = "minimal";
const THINKING_KEY = "thinking";
const THINKING_TYPE_ENABLED = "enabled";
const THINKING_TYPE_DISABLED = "disabled";
const NEW_SYSTEM_PATTERN = /doubao-seed-(2|evolving|character)|doubao-seed-1-8|glm-5/;

function normalizeModel(model: string): string {
  return model.trim().toLowerCase();
}

export class ArkStrategy extends LLMProviderStrategy {
  readonly id = ARK_ID;
  readonly name = ARK_NAME;
  readonly defaultBaseUrl = ARK_DEFAULT_BASE_URL;

  thinkingBody({ model, enabled }: ThinkingBodyContext): Record<string, unknown> {
    const normalized = normalizeModel(model);
    if (NEW_SYSTEM_PATTERN.test(normalized)) {
      return {
        [REASONING_KEY]: {
          [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_MEDIUM : REASONING_EFFORT_MINIMAL,
        },
      };
    }
    return { [THINKING_KEY]: { type: enabled ? THINKING_TYPE_ENABLED : THINKING_TYPE_DISABLED } };
  }
}

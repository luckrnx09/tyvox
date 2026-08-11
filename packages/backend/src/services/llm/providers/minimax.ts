import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const MINIMAX_ID = "minimax" as const;
const MINIMAX_NAME = "MiniMax";
const MINIMAX_DEFAULT_BASE_URL = "https://api.minimaxi.chat/v1";
const THINKING_TYPE_ADAPTIVE = "adaptive";
const THINKING_TYPE_DISABLED = "disabled";

export class MiniMaxStrategy extends LLMProviderStrategy {
  readonly id = MINIMAX_ID;
  readonly name = MINIMAX_NAME;
  readonly defaultBaseUrl = MINIMAX_DEFAULT_BASE_URL;

  thinkingBody({ enabled }: ThinkingBodyContext): Record<string, unknown> {
    return { thinking: { type: enabled ? THINKING_TYPE_ADAPTIVE : THINKING_TYPE_DISABLED } };
  }
}

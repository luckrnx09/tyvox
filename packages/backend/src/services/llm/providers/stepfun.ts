import { LLMProviderStrategy, type ThinkingBodyContext } from "./base.js";

const STEPFUN_ID = "stepfun" as const;
const STEPFUN_NAME = "StepFun";
const STEPFUN_DEFAULT_BASE_URL = "https://api.stepfun.com/v1";
const REASONING_EFFORT_KEY = "reasoning_effort";
const REASONING_EFFORT_LOW = "low";
const REASONING_EFFORT_MEDIUM = "medium";

export class StepFunStrategy extends LLMProviderStrategy {
  readonly id = STEPFUN_ID;
  readonly name = STEPFUN_NAME;
  readonly defaultBaseUrl = STEPFUN_DEFAULT_BASE_URL;

  thinkingBody({ enabled }: ThinkingBodyContext): Record<string, unknown> {
    return { [REASONING_EFFORT_KEY]: enabled ? REASONING_EFFORT_MEDIUM : REASONING_EFFORT_LOW };
  }
}

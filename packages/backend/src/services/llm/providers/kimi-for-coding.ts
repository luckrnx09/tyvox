import { LLMProviderStrategy } from "./base.js";

const KIMI_FOR_CODING_ID = "kimi-for-coding" as const;
const KIMI_FOR_CODING_NAME = "Kimi For Coding";
const KIMI_FOR_CODING_DEFAULT_BASE_URL = "https://api.kimi.com/coding/v1";

export class KimiForCodingStrategy extends LLMProviderStrategy {
  readonly id = KIMI_FOR_CODING_ID;
  readonly name = KIMI_FOR_CODING_NAME;
  readonly defaultBaseUrl = KIMI_FOR_CODING_DEFAULT_BASE_URL;

  customizeBody(body: Record<string, unknown>): void {
    delete body.temperature;
  }
}

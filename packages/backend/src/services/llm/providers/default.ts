import type { LLMProvider } from "@tyvox/sdk/contracts";
import { LLMProviderStrategy } from "./base.js";

export class DefaultProviderStrategy extends LLMProviderStrategy {
  constructor(
    readonly id: LLMProvider,
    readonly name: string,
    readonly defaultBaseUrl: string,
    readonly requiresApiKey: boolean = true,
  ) {
    super();
  }
}

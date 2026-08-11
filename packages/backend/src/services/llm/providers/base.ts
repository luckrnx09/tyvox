import type { LLMProvider } from "@tyvox/sdk/contracts";

export interface ThinkingBodyContext {
  readonly model: string;
  readonly enabled: boolean;
}

export abstract class LLMProviderStrategy {
  abstract readonly id: LLMProvider;
  abstract readonly name: string;
  abstract readonly defaultBaseUrl: string;
  readonly requiresApiKey: boolean = true;

  thinkingBody(_context: ThinkingBodyContext): Record<string, unknown> | null {
    return null;
  }

  customizeBody(_body: Record<string, unknown>, _model: string): void {}
}

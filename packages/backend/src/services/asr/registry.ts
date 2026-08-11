import type { SpeechConfig } from "@tyvox/sdk/contracts";
import { createWhisperProvider } from "./whisper.js";
import { createSenseVoiceProvider } from "./sensevoice.js";
import type { ASRProvider } from "./provider.js";
import { parseProviderId } from "./model-reference.js";

export const ASR_REGISTRY: Record<string, (config: SpeechConfig) => ASRProvider> = {
  whisper: createWhisperProvider,
  sensevoice: createSenseVoiceProvider,
};

export function createASRProvider(config: SpeechConfig): ASRProvider {
  const providerId = parseProviderId(config.provider);
  const factory = ASR_REGISTRY[providerId];
  if (!factory) {
    throw new Error(`Unknown ASR provider: ${providerId}`);
  }
  return factory(config);
}

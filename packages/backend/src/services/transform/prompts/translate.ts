import type { TranslatePayload } from "@tyvox/sdk/contracts";

export function buildTranslateRule(payload: TranslatePayload): string {
  return [
    `Translate the rewritten result into **${payload.target}** as a native speaker would. Output only the translation, never the original text.`,
    `Example (Chinese input, English output — apply the same principle to ${payload.target}):\nInput: 这个会我觉得可以改到明天下午，然后那个报告你顺便发我一下就行\nLiteral (bad): This meeting I think can be moved to tomorrow afternoon, then that report you by the way send me is fine.\nNatural (good): Let's move the meeting to tomorrow afternoon and send me the report when you get a chance.`,
  ].join("\n");
}

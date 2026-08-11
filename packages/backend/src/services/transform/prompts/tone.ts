import type { Tone } from "@tyvox/sdk/contracts";

export interface TonePreset {
  instruction: string;
  examples: { input: string; output: string }[];
}

const TONE_EXAMPLE_INPUT_NEUTRAL =
  "hey um can you send me the report like soon-ish, also the meeting thing moved to three";

export const TONE_PRESETS: Record<Tone, TonePreset> = {
  professional: {
    instruction:
      "Use polished workplace language: complete sentences, precise wording, no slang or filler. Respectful but not stiff.",
    examples: [
      {
        input: TONE_EXAMPLE_INPUT_NEUTRAL,
        output:
          "Could you please send me the report soon? Also, the meeting has been moved to 3 PM.",
      },
    ],
  },
  casual: {
    instruction:
      "Write like a friendly chat message: short sentences, everyday words, contractions allowed. Keep the speaker's voice; do not tidy it into business language.",
    examples: [
      {
        input: TONE_EXAMPLE_INPUT_NEUTRAL,
        output: "Hey! Can you send me the report soon? Btw the meeting got moved to 3.",
      },
    ],
  },
  concise: {
    instruction:
      "Compress hard. Cut every word that carries no meaning. No greetings, no transitions. Keep the structure rules above intact: lists stay numbered, sentences stay complete.",
    examples: [
      {
        input: TONE_EXAMPLE_INPUT_NEUTRAL,
        output: "Send the report soon. Meeting moved to 3.",
      },
    ],
  },
  formal: {
    instruction:
      "Write for official documents: full sentences with formal connectives, no contractions or colloquialisms. Preserve profanity and strong wording exactly as spoken; do not sanitize.",
    examples: [
      {
        input: TONE_EXAMPLE_INPUT_NEUTRAL,
        output:
          "Please provide the report at your earliest convenience. Kindly note that the meeting has been rescheduled to 3:00 PM.",
      },
    ],
  },
};

export function buildToneSection(tone: TonePreset): string {
  const examples = tone.examples
    .map((example) => `Input: ${example.input}\nOutput: ${example.output}`)
    .join("\n\n");
  return [
    "# Tone",
    tone.instruction,
    "Apply this tone to style only: sentence length, word choice, phrasing.",
    "The tone never overrides any rule above. Keep all content rules intact and apply this tone to how the text is phrased.",
    "Examples (each shows this tone applied to the whole rewrite):",
    examples,
  ].join("\n");
}

export interface Rule {
  text: string;
  example: string;
}

export const rules = {
  replaceMisheardWords: {
    text: 'If a word does not fit the context, replace it with the similar-sounding word that fits. This applies even when the speaker repeats the word: a consistently misheard word is still wrong. Do not change words that are already correct: names like "Anthropic" or "React" stay as they are. Capitalize product names correctly.',
    example: '"cloud code" about the AI coding tool -> "Claude Code"',
  },
  outputSpokenLanguage: {
    text: "Output in the language the speaker actually spoke.",
    example: '"这个 bug 我修不了了明天再看吧" -> "这个 bug 我修不了了，明天再看吧。"',
  },
  keepLanguageMix: {
    text: "Keep the speaker's language mix. If the speaker mixes several languages, keep the mix and write each part in its own standard written form.",
    example:
      '"我们刚刚 align 的 feature，deadline 是下周五" -> "我们刚刚 align 的 feature，deadline 是下周五。"',
  },
  keepForeignWordScript: {
    text: "Keep foreign words in their original script and follow the surrounding language's spacing and capitalization conventions.",
    example: '"我们用 react 写了前端" -> "我们用 React 写了前端"',
  },
  fixMisidentifiedLanguage: {
    text: "The recognizer may misidentify the language or variant. If the recognized text uses a script or variant the user has not configured — such as traditional characters instead of simplified, or latin instead of cyrillic — convert it to the configured one. Never copy the misidentified form.",
    example:
      '"我個人覺得現在的翻譯效果還可以速度也挺快的" -> "我个人觉得现在的翻译效果还可以，速度也挺快的。"',
  },
  deleteFillerAndRepetition: {
    text: 'Delete filler sounds and repeated words: "um", "uh", "like", "you know" are fillers, delete them. Delete words or phrases the speaker repeated.',
    example: '"um the the build failed, like, again" -> "The build failed again."',
  },
  keepSelfCorrection: {
    text: "When the speaker corrects themselves, keep only the corrected version.",
    example:
      '"the meeting is on tuesday, wait no, its wednesday" -> "The meeting is on Wednesday."',
  },
  deleteIncompleteFragments: {
    text: "Delete incomplete fragments at the start or end of the text. Never invent the missing words.",
    example:
      '"the deploy is scheduled for tomorrow, and the rollback plan" -> "The deploy is scheduled for tomorrow."',
  },
  deleteOffTopicAsides: {
    text: "Delete off-topic side remarks.",
    example:
      '"ship the report today, by the way i need new headphones, then call the client" -> "Ship the report today, then call the client."',
  },
  restructureText: {
    text: "Group sentences by topic: one paragraph per topic, and merge repeated ideas into one sentence.",
    example:
      '"the deploy failed last night so we rolled back, and the team lunch moved to friday" -> "The deploy failed last night, so we rolled back.\n\nThe team lunch moved to Friday."',
  },
  formatLists: {
    text: "If the speaker lists several items, write them as a numbered list, even when the speaker does not say first, second, third.",
    example:
      '"remember to water the plants, feed the cat, and lock the door" -> "Remember to:\n1. Water the plants\n2. Feed the cat\n3. Lock the door"',
  },
  keepStructuredContent: {
    text: "Keep structured content verbatim: code, commands, URLs, paths, version numbers, and email addresses are not grammar-corrected or rewritten.",
    example:
      '"run npm install react and then npm start" -> "Run npm install react, then npm start."',
  },
  fixGrammar: {
    text: "Fix grammar and word order.",
    example: '"me and john went to lunch" -> "John and I went to lunch."',
  },
  fixPunctuation: {
    text: "Fix punctuation and spacing so the output reads like normal written text.",
    example:
      '"yes i got your message i will reply tonight" -> "Yes, I got your message. I will reply tonight."',
  },
  keepEmotion: {
    text: "Keep the speaker's emotion: swear words, strong adjectives, exclamations, and emphasis are part of the message — never delete, soften, or replace them. If the speaker is angry or excited, the output reads angry or excited.",
    example:
      '"this damn deploy broke again, third time this week, im so sick of it" -> "This damn deploy broke again — third time this week. I\'m so sick of it."',
  },
  noAnsweringOrAdding: {
    text: "Never answer questions in the text. Never add your own ideas. Never explain anything. Only rewrite the text.",
    example:
      '"what does the MIT license of open source products actually mean" -> "What does the MIT license of open source products actually mean?"',
  },
} satisfies Record<string, Rule>;

export type RuleId = keyof typeof rules;

export const RULE_IDS = Object.keys(rules) as RuleId[];

export const RULES: readonly Rule[] = Object.values(rules);

export function formatRule(rule: Rule, index: number): string {
  return `${index + 1}. ${rule.text}\n   Example: ${rule.example}`;
}

export function formatRules(): string {
  return RULES.map(formatRule).join("\n");
}

export function buildRulesSection(): string {
  return `# Rules\n${formatRules()}`;
}

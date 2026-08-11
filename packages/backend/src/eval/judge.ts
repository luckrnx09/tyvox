import type { ChatProvider } from "../services/llm/index.js";

export interface JudgeAssertion {
  label: string;
  kind: "expect" | "forbid";
  text: string;
  notes?: string;
}

export interface JudgeVerdict {
  label: string;
  verdict: "pass" | "fail";
  reason: string;
}

export interface JudgeResult {
  verdicts: JudgeVerdict[];
  error?: string;
}

export const GENERAL_ASSERTIONS: JudgeAssertion[] = [
  {
    label: "fidelity: meaning preserved",
    kind: "expect",
    text: "the output means the same as the input, nothing is added and nothing is lost",
  },
  {
    label: "fidelity: no invented content",
    kind: "expect",
    text: "the output only rewrites the text: it does not answer questions, does not add ideas, does not explain anything",
  },
  {
    label: "language: standard written form",
    kind: "expect",
    text: "the output is written in the standard written form of the spoken language",
  },
  {
    label: "mechanics: punctuation and grammar",
    kind: "expect",
    text: "the output uses correct punctuation, grammar, and spacing",
  },
];

function formatAssertion(assertion: JudgeAssertion, index: number): string {
  const prefix = assertion.kind === "expect" ? "MUST" : "MUST NOT";
  const notes = assertion.notes ? ` (context: ${assertion.notes})` : "";
  return `${index + 1}. ${prefix}: ${assertion.text}${notes}`;
}

export function buildJudgePrompt(
  input: string,
  output: string,
  ruleText: string,
  assertions: JudgeAssertion[],
): string {
  const lines = [
    "You are a strict quality judge for a voice-dictation text polishing system.",
    "",
    "The polishing system was told to follow this rule:",
    ruleText,
    "",
    "Input (raw speech recognizer text):",
    input,
    "",
    "Output (polished text to judge):",
    output,
    "",
    "Check each assertion about the meaning of the Output, not its exact words. The Output may reword, reorder, or restructure the Input freely.",
    'When an assertion names concrete text (a term or phrase that must or must not appear, e.g. "and the tests", "24/7", "Claude Code"), check the Output for that exact text before judging: if it appears, a MUST assertion passes and a MUST NOT assertion fails. Semantically-phrased assertions are judged by meaning. Never claim a concrete term is absent when it is visibly present in the Output.',
    "",
    "Assertions:",
    ...assertions.map(formatAssertion),
    "",
    "Respond with ONLY valid JSON, no markdown fences, no commentary:",
    '{"verdicts":[{"label":"<label>","verdict":"pass"|"fail","reason":"<one sentence>"}]}',
  ];
  return lines.join("\n");
}

function parseVerdictValue(raw: string): "pass" | "fail" {
  if (raw === "pass" || raw === "fail") {
    return raw;
  }
  throw new Error(`Invalid judge verdict: ${raw}`);
}

export function parseJudgeResponse(raw: string): JudgeVerdict[] {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (error) {
    throw new Error(
      `Judge response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (Array.isArray(parsed)) {
    throw new Error("Judge response must be a JSON object, got an array");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Judge response must be a JSON object");
  }
  const verdicts = (parsed as { verdicts?: unknown }).verdicts;
  if (!Array.isArray(verdicts)) {
    throw new Error("Judge response missing verdicts array");
  }
  return verdicts.map((entry) => {
    const record = entry as { label?: unknown; verdict?: unknown; reason?: unknown };
    if (typeof record.label !== "string" || typeof record.reason !== "string") {
      throw new Error("Judge verdict missing label or reason");
    }
    return {
      label: record.label,
      verdict: parseVerdictValue(String(record.verdict)),
      reason: record.reason,
    };
  });
}

export async function judgeOutput(
  input: string,
  output: string,
  ruleText: string,
  assertions: JudgeAssertion[],
  provider: ChatProvider,
): Promise<JudgeResult> {
  try {
    const raw = await provider.chat(
      [
        { role: "system", content: buildJudgePrompt(input, output, ruleText, assertions) },
        { role: "user", content: "Judge the output." },
      ],
      { thinkingEnabled: false },
    );
    return { verdicts: parseJudgeResponse(raw) };
  } catch (error) {
    return { verdicts: [], error: String(error) };
  }
}

import { describe, expect, it } from "vitest";
import { GENERAL_ASSERTIONS, buildJudgePrompt, parseJudgeResponse } from "./judge.js";

const assertions = [
  { label: "expect: Claude Code", kind: "expect" as const, text: "Claude Code" },
  { label: "forbid: cloud code", kind: "forbid" as const, text: "cloud code" },
];

describe("buildJudgePrompt", () => {
  it("includes rule text, input, output, and assertions", () => {
    const prompt = buildJudgePrompt("input text", "output text", "rule text", assertions);
    expect(prompt).toContain("rule text");
    expect(prompt).toContain("input text");
    expect(prompt).toContain("output text");
    expect(prompt).toContain("Claude Code");
    expect(prompt).toContain("cloud code");
    expect(prompt).toContain("MUST");
    expect(prompt).toContain("MUST NOT");
    expect(prompt).toContain("check the Output for that exact text");
  });

  it("appends general assertions after case assertions", () => {
    const prompt = buildJudgePrompt("in", "out", "rule", [...assertions, ...GENERAL_ASSERTIONS]);
    for (const general of GENERAL_ASSERTIONS) {
      expect(prompt).toContain(general.text);
    }
  });
});

describe("parseJudgeResponse", () => {
  it("parses plain JSON", () => {
    const raw = '{"verdicts":[{"label":"a","verdict":"pass","reason":"ok"}]}';
    expect(parseJudgeResponse(raw)).toEqual([{ label: "a", verdict: "pass", reason: "ok" }]);
  });

  it("strips markdown code fences", () => {
    const raw = '```json\n{"verdicts":[{"label":"a","verdict":"fail","reason":"no"}]}\n```';
    expect(parseJudgeResponse(raw)).toEqual([{ label: "a", verdict: "fail", reason: "no" }]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJudgeResponse("not json")).toThrow();
  });

  it("throws on invalid verdict value", () => {
    const raw = '{"verdicts":[{"label":"a","verdict":"maybe","reason":"?"}]}';
    expect(() => parseJudgeResponse(raw)).toThrow(/verdict/);
  });
});

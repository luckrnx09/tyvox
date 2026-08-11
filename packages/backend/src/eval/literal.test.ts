import { describe, expect, it } from "vitest";
import { findForbiddenHit, findMissingExpected } from "./literal.js";

describe("findForbiddenHit", () => {
  it("finds a forbidden phrase case-insensitively", () => {
    expect(findForbiddenHit(["code X"], "Use code x to write a function.")).toBe("code X");
  });

  it("finds a forbidden phrase in Chinese", () => {
    expect(findForbiddenHit(["覺得"], "我觉得效果还可以")).toBeUndefined();
    expect(findForbiddenHit(["覺得"], "我覺得效果還可以")).toBe("覺得");
  });

  it("does not match similar but different words", () => {
    expect(findForbiddenHit(["cloud code"], "Open Claude Code for me.")).toBeUndefined();
  });

  it("does not match inside a larger word", () => {
    expect(findForbiddenHit(["um"], "Visit the forum for premium tips.")).toBeUndefined();
  });

  it("matches flags with non-word prefixes", () => {
    expect(findForbiddenHit(["--verbose"], "run it with --verbose enabled")).toBe("--verbose");
  });

  it("returns undefined when nothing is forbidden", () => {
    expect(findForbiddenHit([], "any output")).toBeUndefined();
  });
});

describe("findMissingExpected", () => {
  it("finds a missing expected phrase", () => {
    expect(findMissingExpected(["Claude Code"], "Open cloud code.")).toBe("Claude Code");
  });

  it("returns undefined when all expected phrases are present", () => {
    expect(
      findMissingExpected(["Claude Code", "Anthropic"], "Claude Code by Anthropic."),
    ).toBeUndefined();
  });

  it("matches paragraph breaks without word boundaries", () => {
    expect(findMissingExpected(["\n\n"], "First topic.\n\nSecond topic.")).toBeUndefined();
  });

  it("matches expected phrases case-insensitively", () => {
    expect(findMissingExpected(["Dave"], "Send it to dave.")).toBeUndefined();
  });
});

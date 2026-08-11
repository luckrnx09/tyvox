import { describe, expect, it } from "vitest";
import { createThinkTagStripper, stripThinkTags } from "./strip-think-tags.js";

describe("stripThinkTags", () => {
  it("removes a complete think block", () => {
    expect(stripThinkTags("hello <think>secret</think> world")).toBe("hello  world");
  });

  it("removes multiline and case-insensitive blocks", () => {
    expect(stripThinkTags("<THINK>\nline\n</THINK>kept")).toBe("kept");
  });

  it("removes an unterminated think block to the end", () => {
    expect(stripThinkTags("kept<think>never closed")).toBe("kept");
  });

  it("keeps text without tags unchanged", () => {
    expect(stripThinkTags("plain text")).toBe("plain text");
  });

  it("removes multiple blocks", () => {
    expect(stripThinkTags("a<think>1</think>b<think>2</think>c")).toBe("abc");
  });
});

describe("createThinkTagStripper", () => {
  it("strips tags split across chunks", () => {
    const stripper = createThinkTagStripper();
    expect(stripper.push("he")).toBe("he");
    expect(stripper.push("<think>sec")).toBe("");
    expect(stripper.push("ret</think>")).toBe("");
    expect(stripper.push("llo")).toBe("llo");
    expect(stripper.flush()).toBe("");
  });

  it("flushes remaining text outside a think block", () => {
    const stripper = createThinkTagStripper();
    expect(stripper.push("kept")).toBe("kept");
    expect(stripper.flush()).toBe("");
  });

  it("flushes nothing when inside a think block", () => {
    const stripper = createThinkTagStripper();
    expect(stripper.push("<think>secret")).toBe("");
    expect(stripper.flush()).toBe("");
  });
});

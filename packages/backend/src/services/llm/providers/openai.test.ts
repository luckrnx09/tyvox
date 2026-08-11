import { describe, expect, it } from "vitest";
import { OpenAIStrategy } from "./openai.js";

const strategy = new OpenAIStrategy();

describe("OpenAIStrategy.thinkingBody", () => {
  it.each([
    ["o1-preview", false, { reasoning_effort: "low" }],
    ["o3-mini", false, { reasoning_effort: "low" }],
    ["o4-mini", false, { reasoning_effort: "low" }],
    ["o1-preview", true, { reasoning_effort: "medium" }],
    ["o3-mini", true, { reasoning_effort: "medium" }],
    ["o4-mini", true, { reasoning_effort: "medium" }],
    ["gpt-5", false, { reasoning_effort: "minimal" }],
    ["gpt-5-mini", false, { reasoning_effort: "minimal" }],
    ["gpt-5-nano", false, { reasoning_effort: "minimal" }],
    ["gpt-5", true, { reasoning_effort: "medium" }],
    ["openai/gpt-5-mini", false, { reasoning_effort: "minimal" }],
    ["gpt-5.1", false, { reasoning_effort: "none" }],
    ["gpt-5.5", true, { reasoning_effort: "medium" }],
  ] as const)("injects %j for %s when enabled=%s", (model, enabled, expected) => {
    expect(strategy.thinkingBody({ model, enabled })).toEqual(expected);
  });

  it("always uses high for gpt-5-pro", () => {
    expect(strategy.thinkingBody({ model: "gpt-5-pro", enabled: false })).toEqual({
      reasoning_effort: "high",
    });
    expect(strategy.thinkingBody({ model: "gpt-5-pro", enabled: true })).toEqual({
      reasoning_effort: "high",
    });
  });

  it.each(["gpt-4o", "gpt-4o-mini", "chatgpt-4o-latest"])(
    "injects nothing for non-reasoning model %s",
    (model) => {
      expect(strategy.thinkingBody({ model, enabled: false })).toBeNull();
    },
  );
});

describe("OpenAIStrategy.customizeBody", () => {
  it.each(["gpt-5-mini", "gpt-5.1", "o3-mini", "o4-mini"])(
    "removes temperature for reasoning model %s",
    (model) => {
      const body: Record<string, unknown> = { model, temperature: 0.3 };
      strategy.customizeBody(body, model);
      expect("temperature" in body).toBe(false);
    },
  );

  it("keeps temperature for non-reasoning models", () => {
    const body: Record<string, unknown> = { model: "gpt-4o", temperature: 0.3 };
    strategy.customizeBody(body, "gpt-4o");
    expect(body.temperature).toBe(0.3);
  });
});

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RULE_IDS, type RuleId } from "../services/transform/prompts/rules.js";
import { loadSamples, validateCoverage, type EvalSample } from "./coverage.js";

const samplesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "samples");

function minimalSample(rule: RuleId): EvalSample {
  return {
    name: "minimal",
    dimension: "filler",
    rule,
    input: "input",
    assert: { expect: ["expects something"] },
  };
}

describe("validateCoverage", () => {
  it("rejects an unknown rule id", () => {
    expect(() => validateCoverage([minimalSample("unknownRule" as RuleId)])).toThrow(
      /Unknown rule/,
    );
  });

  it("rejects coverage gaps", () => {
    expect(() => validateCoverage([minimalSample("outputSpokenLanguage")])).toThrow(
      /without eval coverage/,
    );
  });

  it("accepts samples that cover every rule id", () => {
    const samples = RULE_IDS.map((rule) => minimalSample(rule));
    expect(() => validateCoverage(samples)).not.toThrow();
  });
});

describe("sample files", () => {
  it("cover every rule id at least once", () => {
    const covered = new Set(loadSamples().map((sample) => sample.rule));
    expect(RULE_IDS.filter((id) => !covered.has(id))).toEqual([]);
  });

  it("have no unknown rule ids", () => {
    for (const sample of loadSamples()) {
      expect(RULE_IDS).toContain(sample.rule);
    }
  });

  it("have a dimension matching the filename", () => {
    for (const file of readdirSync(samplesDir).filter((f) => f.endsWith(".json"))) {
      const dimension = path.basename(file, ".json");
      const raw = JSON.parse(readFileSync(path.join(samplesDir, file), "utf8")) as EvalSample[];
      for (const sample of raw) {
        expect(sample.dimension).toBe(dimension);
      }
    }
  });
});

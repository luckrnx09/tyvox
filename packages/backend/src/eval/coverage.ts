import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Tone } from "@tyvox/sdk/contracts";
import { RULE_IDS, type RuleId } from "../services/transform/prompts/rules.js";

export interface EvalSampleContext {
  languages?: string;
  tone?: Tone;
  vocabulary?: string;
  translateTarget?: string;
}

export interface EvalSample {
  name: string;
  dimension: string;
  rule: RuleId;
  input: string;
  context?: EvalSampleContext;
  assert: {
    expect?: string[];
    forbid?: string[];
    notes?: string;
  };
}

const samplesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "samples");

export function loadSamples(): EvalSample[] {
  return readdirSync(samplesDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .flatMap((file) => {
      const dimension = path.basename(file, ".json");
      const raw = JSON.parse(readFileSync(path.join(samplesDir, file), "utf8")) as EvalSample[];
      return raw.map((sample) => ({ ...sample, dimension }));
    });
}

export function validateCoverage(samples: readonly EvalSample[]): void {
  for (const sample of samples) {
    if (!sample.name || !sample.input || !sample.rule) {
      throw new Error(`Invalid sample: missing name, input, or rule`);
    }
    if (!sample.assert || (!sample.assert.expect?.length && !sample.assert.forbid?.length)) {
      throw new Error(`Invalid sample "${sample.name}": must have at least one assertion`);
    }
  }
  const covered = new Set(samples.map((sample) => sample.rule));
  for (const id of covered) {
    if (!(RULE_IDS as readonly string[]).includes(id)) {
      throw new Error(`Unknown rule id in sample: ${id}`);
    }
  }
  const missing = RULE_IDS.filter((id) => !covered.has(id));
  if (missing.length > 0) {
    throw new Error(`Rules without eval coverage: ${missing.join(", ")}`);
  }
}

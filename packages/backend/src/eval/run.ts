import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Persona } from "../repositories/types.js";
import type { TransformTextEnrichOption } from "@tyvox/sdk/contracts";
import { buildTransformPrompt } from "../services/transform/prompts/index.js";
import { TONE_PRESETS, type TonePreset } from "../services/transform/prompts/tone.js";
import { createLLMProvider, type LLMProvider } from "../services/llm/index.js";
import { loadSamples, validateCoverage, type EvalSample } from "./coverage.js";
import { loadEnvConfig } from "./env-config.js";
import { GENERAL_ASSERTIONS, judgeOutput } from "./judge.js";
import { findForbiddenHit, findMissingExpected } from "./literal.js";
import { getRuleText } from "./rule-text.js";
import {
  buildSectionLines,
  createDomainResult,
  printRunCase,
  writeReports,
  type DomainResult,
  type RunCase,
} from "./report.js";

interface BaseContext {
  persona: Persona;
  vocabulary: string;
  tone: TonePreset;
  recentHistory: string;
}

function parseOnlyDimension(): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf("--only");
  if (index < 0) {
    return undefined;
  }
  const dimension = args[index + 1];
  if (!dimension) {
    throw new Error("--only requires a dimension name");
  }
  return dimension;
}

async function runSample(
  sample: EvalSample,
  provider: LLMProvider,
  judgeProvider: LLMProvider,
  baseContext: BaseContext,
): Promise<RunCase> {
  if (sample.context?.tone && !Object.hasOwn(TONE_PRESETS, sample.context.tone)) {
    throw new Error(`Invalid tone in sample "${sample.name}": ${sample.context.tone}`);
  }
  const tone = sample.context?.tone ? TONE_PRESETS[sample.context.tone] : baseContext.tone;
  const enrichOptions: TransformTextEnrichOption[] = sample.context?.translateTarget
    ? [{ type: "translate", payload: { target: sample.context.translateTarget } }]
    : [];
  const systemPrompt = buildTransformPrompt(enrichOptions, {
    ...baseContext,
    tone,
    languages: sample.context?.languages ?? "",
    vocabulary: sample.context?.vocabulary ?? "",
  });

  const runCase: RunCase = {
    name: sample.name,
    rule: sample.rule,
    status: "PASS",
    input: sample.input,
    output: "",
    verdicts: [],
    error: "",
  };
  try {
    runCase.output = (
      await provider.chat(
        [
          { content: systemPrompt, role: "system" },
          { content: sample.input, role: "user" },
        ],
        { thinkingEnabled: false },
      )
    ).trim();
    const forbiddenHit = findForbiddenHit(sample.assert.forbid ?? [], runCase.output);
    if (forbiddenHit) {
      runCase.status = "FAIL";
      runCase.verdicts = [
        {
          label: `forbid (literal): ${forbiddenHit}`,
          verdict: "fail",
          reason: "Output contains a forbidden phrase",
        },
      ];
      return runCase;
    }
    const missingExpected = findMissingExpected(sample.assert.expect ?? [], runCase.output);
    if (missingExpected) {
      runCase.status = "FAIL";
      runCase.verdicts = [
        {
          label: `expect (literal): ${missingExpected}`,
          verdict: "fail",
          reason: "Output is missing a required phrase",
        },
      ];
      return runCase;
    }
    const assertions = [
      ...(sample.assert.expect ?? []).map((text) => ({
        label: `expect: ${text}`,
        kind: "expect" as const,
        text,
        notes: sample.assert.notes,
      })),
      ...(sample.assert.forbid ?? []).map((text) => ({
        label: `forbid: ${text}`,
        kind: "forbid" as const,
        text,
        notes: sample.assert.notes,
      })),
      ...GENERAL_ASSERTIONS,
    ];
    const judged = await judgeOutput(
      sample.input,
      runCase.output,
      getRuleText(sample.rule),
      assertions,
      judgeProvider,
    );
    if (judged.error) {
      runCase.status = "ERROR";
      runCase.error = judged.error;
    } else if (judged.verdicts.length === 0) {
      runCase.status = "ERROR";
      runCase.error = "Judge returned no verdicts";
    } else if (judged.verdicts.length !== assertions.length) {
      runCase.status = "ERROR";
      runCase.error = `Judge returned ${judged.verdicts.length} of ${assertions.length} verdicts`;
    } else {
      runCase.verdicts = judged.verdicts.map((verdict, index) => ({
        ...verdict,
        label: assertions[index].label,
      }));
      const failedVerdicts = judged.verdicts.filter((verdict) => verdict.verdict === "fail");
      runCase.status = failedVerdicts.length > 0 ? "FAIL" : "PASS";
    }
  } catch (error) {
    runCase.status = "ERROR";
    runCase.error = String(error);
  }
  return runCase;
}

async function main(): Promise<void> {
  const onlyDimension = parseOnlyDimension();
  const samples = loadSamples();
  validateCoverage(samples);
  const filtered = onlyDimension
    ? samples.filter((sample) => sample.dimension === onlyDimension)
    : samples;
  if (filtered.length === 0) {
    throw new Error(`No samples for dimension: ${onlyDimension}`);
  }

  const { llmConfig, judgeModel } = loadEnvConfig();
  const provider = createLLMProvider(llmConfig);
  const judgeProvider = createLLMProvider({ ...llmConfig, model: judgeModel });
  const baseContext: BaseContext = {
    persona: { rows: [] },
    vocabulary: "",
    tone: TONE_PRESETS[llmConfig.tone],
    recentHistory: "",
  };

  const resultsByDomain = new Map<string, DomainResult>();
  for (const sample of filtered) {
    const domain = sample.dimension;
    if (!resultsByDomain.has(domain)) {
      resultsByDomain.set(domain, createDomainResult());
    }
    const result = resultsByDomain.get(domain)!;
    const runCase = await runSample(sample, provider, judgeProvider, baseContext);
    if (runCase.status === "PASS") {
      result.passed++;
    } else if (runCase.status === "FAIL") {
      result.failed++;
    } else {
      result.errored++;
    }
    printRunCase(runCase);
    result.cases.push(runCase);
    result.sections.push(buildSectionLines(runCase));
  }

  const outputsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "outputs");
  writeReports(outputsDir, resultsByDomain, llmConfig.model, judgeModel);

  const totals = Array.from(resultsByDomain.values()).reduce(
    (acc, result) => ({
      passed: acc.passed + result.passed,
      failed: acc.failed + result.failed,
      errored: acc.errored + result.errored,
    }),
    { passed: 0, failed: 0, errored: 0 },
  );
  const total = totals.passed + totals.failed + totals.errored;
  console.log(
    `\n${totals.passed}/${total} passed, ${totals.failed} failed, ${totals.errored} errored`,
  );
  if (totals.failed > 0 || totals.errored > 0) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

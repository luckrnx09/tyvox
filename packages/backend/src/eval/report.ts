import fs from "node:fs";
import path from "node:path";
import type { JudgeVerdict } from "./judge.js";

export interface RunCase {
  name: string;
  rule: string;
  status: "PASS" | "FAIL" | "ERROR";
  input: string;
  output: string;
  verdicts: JudgeVerdict[];
  error: string;
}

export interface DomainResult {
  passed: number;
  failed: number;
  errored: number;
  sections: string[];
  cases: RunCase[];
}

export function createDomainResult(): DomainResult {
  return { passed: 0, failed: 0, errored: 0, sections: [], cases: [] };
}

export function buildSectionLines(runCase: RunCase): string {
  const lines = [`## ${runCase.name} — ${runCase.status}`, `- Rule: ${runCase.rule}`];
  if (runCase.error) {
    lines.push(`- Error: ${runCase.error}`);
  }
  lines.push(`- Input: ${runCase.input}`, `- Output: ${runCase.output || "(empty)"}`);
  for (const verdict of runCase.verdicts) {
    lines.push(`- ${verdict.label}: ${verdict.verdict} — ${verdict.reason}`);
  }
  return lines.join("\n");
}

export function printRunCase(runCase: RunCase): void {
  if (runCase.status === "PASS") {
    console.log(`PASS ${runCase.name}`);
  } else if (runCase.status === "FAIL") {
    console.log(`FAIL ${runCase.name}`);
    console.log(`  input:    ${runCase.input}`);
    console.log(`  output:   ${runCase.output}`);
    for (const verdict of runCase.verdicts.filter((v) => v.verdict === "fail")) {
      console.log(`  ${verdict.label}: ${verdict.reason}`);
    }
  } else {
    console.log(`ERROR ${runCase.name}: ${runCase.error}`);
  }
}

export function writeReports(
  outputsDir: string,
  resultsByDomain: Map<string, DomainResult>,
  polisherModel: string,
  judgeModel: string,
): void {
  fs.mkdirSync(outputsDir, { recursive: true });
  const timestamp = new Date().toISOString();
  for (const [domain, result] of resultsByDomain) {
    const jsonReport = {
      timestamp,
      polisherModel,
      judgeModel,
      cases: result.cases,
    };
    fs.writeFileSync(
      path.join(outputsDir, `${domain}.json`),
      `${JSON.stringify(jsonReport, null, 2)}\n`,
    );
    const header = [
      `# Eval Output: ${domain}`,
      "",
      `- Timestamp: ${timestamp}`,
      `- Polisher model: ${polisherModel}`,
      `- Judge model: ${judgeModel}`,
      `- Passed: ${result.passed}/${result.cases.length}`,
      "",
    ].join("\n");
    const body = result.sections.length > 0 ? `${result.sections.join("\n\n")}\n` : "\n";
    fs.writeFileSync(path.join(outputsDir, `${domain}.md`), `${header}${body}`);
  }
}

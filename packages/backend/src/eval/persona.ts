import { randomUUID } from "node:crypto";
import { extractMemory } from "../services/memory/extract.js";
import { createLLMProvider } from "../services/llm/index.js";
import { DEFAULT_CONFIG } from "../repositories/index.js";
import type { HistoryEntry, Persona } from "../repositories/types.js";
import { MS_PER_DAY } from "../utils/dates.js";

interface Scenario {
  name: string;
  current: Persona;
  entries: HistoryEntry[];
  checks: (persona: Persona) => string | null;
}

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString();

function entry(input: string, output: string): HistoryEntry {
  return { id: randomUUID(), input, output, duration: 1, timestamp: now };
}

const scenarios: Scenario[] = [
  {
    name: "adds new role",
    current: { rows: [] },
    entries: [entry("i am a software engineer", "I am a software engineer.")],
    checks: (p) =>
      p.rows.some((r) => r.category === "role" && r.fact.includes("software engineer"))
        ? null
        : "missing software engineer role",
  },
  {
    name: "merges similar tools",
    current: {
      rows: [
        {
          id: "r1",
          category: "tools",
          fact: "uses VS Code",
          createdAt: yesterday,
          updatedAt: yesterday,
        },
        {
          id: "r2",
          category: "tools",
          fact: "uses Cursor",
          createdAt: yesterday,
          updatedAt: yesterday,
        },
      ],
    },
    entries: [entry("i use vscode and cursor daily", "I use VS Code and Cursor daily.")],
    checks: (p) => {
      if (p.rows.length !== 1) {
        return `expected 1 merged tools row, got ${p.rows.length}`;
      }
      const fact = p.rows[0].fact.toLowerCase();
      return fact.includes("vs code") || fact.includes("vscode") || fact.includes("cursor")
        ? null
        : `unexpected merged row: ${p.rows[0].fact}`;
    },
  },
  {
    name: "deletes contradicted tool",
    current: {
      rows: [
        {
          id: "r1",
          category: "tools",
          fact: "uses Cursor",
          createdAt: yesterday,
          updatedAt: yesterday,
        },
      ],
    },
    entries: [entry("i stopped using cursor", "I stopped using Cursor.")],
    checks: (p) =>
      p.rows.some(
        (r) => r.category === "tools" && r.fact.startsWith("uses") && r.fact.includes("Cursor"),
      )
        ? "Cursor row should have been deleted"
        : null,
  },
];

async function main() {
  const {
    EVAL_LLM_BASE_URL: baseUrl,
    EVAL_LLM_MODEL: model,
    EVAL_LLM_API_KEY: apiKey,
  } = process.env;
  if (!baseUrl || !model) {
    throw new Error("EVAL_LLM_BASE_URL and EVAL_LLM_MODEL are required");
  }
  const llmConfig = { ...DEFAULT_CONFIG.llm, baseUrl, model, apiKey: apiKey ?? "" };
  const provider = createLLMProvider(llmConfig);

  let failed = 0;
  for (const scenario of scenarios) {
    const result = await extractMemory(scenario.entries, scenario.current, provider);
    const error = scenario.checks(result.persona);
    if (error) {
      failed++;
      console.log(`FAIL ${scenario.name}: ${error}`);
      console.log(`  rows: ${JSON.stringify(result.persona.rows)}`);
    } else {
      console.log(`PASS ${scenario.name}`);
    }
  }
  console.log(`\n${scenarios.length - failed}/${scenarios.length} passed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main();

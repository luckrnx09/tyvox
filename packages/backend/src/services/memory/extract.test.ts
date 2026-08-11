import { test, expect, vi } from "vitest";
import { extractMemory } from "./extract.js";
import type { HistoryEntry, Persona } from "../../repositories/index.js";
import type { ChatMessage, ChatProvider } from "../llm/index.js";

const entries: HistoryEntry[] = [
  {
    id: "1",
    input: "open cloud code",
    output: "Open Claude Code",
    duration: 1,
    timestamp: "2026-07-16T00:00:00Z",
  },
];

function createProvider(
  handler: (systemPrompt: string, messages: ChatMessage[]) => string,
): ChatProvider {
  return {
    chat: async (messages) =>
      handler(messages.find((m) => m.role === "system")?.content ?? "", messages),
  };
}

function isVocabularyPrompt(systemPrompt: string): boolean {
  return systemPrompt.includes("list the special words");
}

function row(partial: {
  id?: string;
  category: "role" | "topic" | "tools";
  fact: string;
}): Persona["rows"][number] {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? "r-new",
    category: partial.category,
    fact: partial.fact,
    createdAt: now,
    updatedAt: now,
  };
}

test("extracts vocabulary and persona together", async () => {
  const returnedRows = [{ category: "role", fact: "software engineer" }];
  const provider = createProvider((system) =>
    isVocabularyPrompt(system)
      ? JSON.stringify({ vocabulary: ["Claude Code"] })
      : JSON.stringify(returnedRows),
  );
  const result = await extractMemory(entries, { rows: [] }, provider);
  expect(result.vocabulary).toEqual(["Claude Code"]);
  expect(result.persona.rows).toHaveLength(1);
  expect(result.persona.rows[0].category).toBe("role");
  expect(result.persona.rows[0].fact).toBe("software engineer");
});

test("keeps unchanged rows untouched", async () => {
  const createdAt = "2026-07-01T00:00:00Z";
  const updatedAt = "2026-07-10T00:00:00Z";
  const current: Persona = {
    rows: [{ id: "r1", category: "role", fact: "software engineer", createdAt, updatedAt }],
  };
  const provider = createProvider((system) =>
    isVocabularyPrompt(system)
      ? JSON.stringify({ vocabulary: [] })
      : JSON.stringify([{ id: "r1", category: "role", fact: "software engineer" }]),
  );
  const result = await extractMemory(entries, current, provider);
  expect(result.persona.rows).toEqual(current.rows);
});

test("deletes rows missing from LLM response", async () => {
  const current: Persona = {
    rows: [
      {
        id: "r1",
        category: "role",
        fact: "software engineer",
        createdAt: "2026-07-01T00:00:00Z",
        updatedAt: "2026-07-10T00:00:00Z",
      },
      {
        id: "r2",
        category: "tools",
        fact: "cursor",
        createdAt: "2026-07-01T00:00:00Z",
        updatedAt: "2026-07-10T00:00:00Z",
      },
    ],
  };
  const provider = createProvider((system) =>
    isVocabularyPrompt(system)
      ? JSON.stringify({ vocabulary: [] })
      : JSON.stringify([{ id: "r1", category: "role", fact: "software engineer" }]),
  );
  const result = await extractMemory(entries, current, provider);
  expect(result.persona.rows.map((r) => r.id)).toEqual(["r1"]);
});

test("assigns new id to changed row", async () => {
  const current: Persona = {
    rows: [
      {
        id: "r1",
        category: "role",
        fact: "engineer",
        createdAt: "2026-07-01T00:00:00Z",
        updatedAt: "2026-07-10T00:00:00Z",
      },
    ],
  };
  const provider = createProvider((system) =>
    isVocabularyPrompt(system)
      ? JSON.stringify({ vocabulary: [] })
      : JSON.stringify([{ id: "r1", category: "role", fact: "senior engineer" }]),
  );
  const result = await extractMemory(entries, current, provider);
  expect(result.persona.rows[0].id).not.toBe("r1");
  expect(result.persona.rows[0].fact).toBe("senior engineer");
});

test("calls chat with provider defaults (no options)", async () => {
  const chat = vi.fn().mockResolvedValue(JSON.stringify({ vocabulary: [] }));
  await extractMemory(entries, { rows: [] }, { chat });
  for (const call of chat.mock.calls) {
    expect(call[1]).toBeUndefined();
  }
});

test("keeps current persona after invalid JSON response", async () => {
  const current: Persona = { rows: [row({ id: "r1", category: "role", fact: "engineer" })] };
  const provider = createProvider((system) =>
    isVocabularyPrompt(system) ? JSON.stringify({ vocabulary: [] }) : "not json",
  );
  const result = await extractMemory(entries, current, provider);
  expect(result.persona).toEqual(current);
});

test("keeps current persona when all returned rows are malformed", async () => {
  const current: Persona = { rows: [row({ id: "r1", category: "role", fact: "engineer" })] };
  const provider = createProvider((system) =>
    isVocabularyPrompt(system)
      ? JSON.stringify({ vocabulary: [] })
      : JSON.stringify([{ text: "engineer" }]),
  );
  const result = await extractMemory(entries, current, provider);
  expect(result.persona).toEqual(current);
});

test("drops rows with multi-line facts but keeps valid ones", async () => {
  const current: Persona = { rows: [] };
  const provider = createProvider((system) =>
    isVocabularyPrompt(system)
      ? JSON.stringify({ vocabulary: [] })
      : JSON.stringify([
          { category: "role", fact: "engineer\nscientist" },
          { category: "tools", fact: "cursor" },
        ]),
  );
  const result = await extractMemory(entries, current, provider);
  expect(result.persona.rows).toHaveLength(1);
  expect(result.persona.rows[0].fact).toBe("cursor");
});

test("trims rows that violate limits", async () => {
  const current: Persona = { rows: [row({ id: "r1", category: "role", fact: "engineer" })] };
  const provider = createProvider((system) =>
    isVocabularyPrompt(system)
      ? JSON.stringify({ vocabulary: [] })
      : JSON.stringify([{ category: "role", fact: "a".repeat(100) }]),
  );
  const result = await extractMemory(entries, current, provider);
  expect(result.persona.rows.some((r) => r.fact === "a".repeat(100))).toBe(false);
  expect(result.persona.rows.length).toBeLessThanOrEqual(10);
});

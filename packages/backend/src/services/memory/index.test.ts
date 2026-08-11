import { describe, test, expect, vi, beforeEach } from "vitest";
import { processUserMemory } from "./index.js";
import {
  historyRepository,
  vocabularyRepository,
  personaRepository,
  type HistoryEntry,
  type Persona,
} from "../../repositories/index.js";
import { extractMemory } from "./extract.js";

vi.mock("../../repositories/index.js", () => ({
  historyRepository: { list: vi.fn(), delete: vi.fn() },
  vocabularyRepository: { add: vi.fn() },
  personaRepository: { read: vi.fn(), write: vi.fn() },
}));

vi.mock("../user-config/index.js", () => ({
  getUserConfig: vi.fn().mockResolvedValue({ llm: {} }),
}));

vi.mock("../llm/index.js", () => ({
  createLLMProvider: vi.fn().mockReturnValue({ chat: vi.fn() }),
}));

vi.mock("./extract.js", () => ({
  extractMemory: vi.fn().mockResolvedValue({
    vocabulary: ["Claude Code"],
    persona: {
      rows: [{ id: "r1", category: "role", fact: "user", createdAt: "now", updatedAt: "now" }],
    },
  }),
}));

function entry(id: string, outputLength: number): HistoryEntry {
  return {
    id,
    input: "a",
    output: "x".repeat(outputLength),
    duration: 1,
    timestamp: "2026-07-16T00:00:00Z",
  };
}

describe("processUserMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(personaRepository.read).mockResolvedValue({ rows: [] });
  });

  test("does nothing when history is empty", async () => {
    vi.mocked(historyRepository.list).mockResolvedValue([]);
    await processUserMemory("u1");
    expect(extractMemory).not.toHaveBeenCalled();
    expect(historyRepository.delete).not.toHaveBeenCalled();
  });

  test("discards short-output entries without calling the LLM", async () => {
    vi.mocked(historyRepository.list).mockResolvedValue([entry("1", 3), entry("2", 5)]);
    await processUserMemory("u1");
    expect(extractMemory).not.toHaveBeenCalled();
    expect(historyRepository.delete).toHaveBeenCalledWith("u1", ["1", "2"]);
  });

  test("extracts a batch within the output char budget", async () => {
    vi.mocked(historyRepository.list).mockResolvedValue([
      entry("1", 300),
      entry("2", 300),
      entry("3", 100),
    ]);
    await processUserMemory("u1");
    expect(vi.mocked(extractMemory).mock.calls[0][0].map((e) => e.id)).toEqual(["1"]);
    expect(historyRepository.delete).toHaveBeenCalledWith("u1", ["1"]);
  });

  test("processes first entry alone when it exceeds the budget", async () => {
    vi.mocked(historyRepository.list).mockResolvedValue([entry("1", 600), entry("2", 100)]);
    await processUserMemory("u1");
    expect(vi.mocked(extractMemory).mock.calls[0][0].map((e) => e.id)).toEqual(["1"]);
    expect(historyRepository.delete).toHaveBeenCalledWith("u1", ["1"]);
  });

  test("stores extracted vocabulary and changed persona", async () => {
    vi.mocked(historyRepository.list).mockResolvedValue([entry("1", 100)]);
    await processUserMemory("u1");
    expect(vocabularyRepository.add).toHaveBeenCalledWith("u1", ["Claude Code"]);
    expect(personaRepository.write).toHaveBeenCalledWith("u1", {
      rows: [{ id: "r1", category: "role", fact: "user", createdAt: "now", updatedAt: "now" }],
    });
  });

  test("skips persona write when unchanged", async () => {
    vi.mocked(historyRepository.list).mockResolvedValue([entry("1", 100)]);
    const unchanged = {
      rows: [{ id: "r1", category: "role", fact: "user", createdAt: "now", updatedAt: "now" }],
    };
    vi.mocked(personaRepository.read).mockResolvedValue(unchanged as Persona);
    vi.mocked(extractMemory).mockResolvedValue({ vocabulary: [], persona: unchanged as Persona });
    await processUserMemory("u1");
    expect(personaRepository.write).not.toHaveBeenCalled();
    expect(historyRepository.delete).toHaveBeenCalledWith("u1", ["1"]);
  });
});

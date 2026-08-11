import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFilePersonaRepository } from "../../repositories/persona.js";
import { createFileHistoryRepository } from "../../repositories/history.js";
import { createFileRecentHistoryRepository } from "../../repositories/recent-history.js";
import { createLLMProvider } from "../llm/index.js";
import { buildTransformPrompt } from "./prompts/index.js";
import { computeFirstTokenTimeoutSeconds, transformText } from "./index.js";
import { TONE_PRESETS } from "./prompts/tone.js";
import {
  personaRepository,
  historyRepository,
  recentHistoryRepository,
} from "../../repositories/index.js";

vi.mock("../llm/index.js", () => ({
  createLLMProvider: vi.fn(),
}));

vi.mock("./prompts/index.js", () => ({
  buildTransformPrompt: vi.fn(() => "mocked-system-prompt"),
}));

vi.mock("../vocabulary/index.js", () => ({
  getVocabularyMarkdown: vi.fn().mockResolvedValue("vocab-md"),
}));

vi.mock("../user-config/index.js", async () => {
  const { DEFAULT_CONFIG } = await import("../../repositories/user-config.js");
  return {
    getUserConfig: vi.fn().mockResolvedValue({
      ...DEFAULT_CONFIG,
      speech: { ...DEFAULT_CONFIG.speech, languages: ["English", "Chinese (Simplified)"] },
    }),
  };
});

vi.mock("../../repositories/index.js", async () => {
  const root = await mkdtemp(join(tmpdir(), "transform-service-"));
  return {
    personaRepository: createFilePersonaRepository(root),
    historyRepository: createFileHistoryRepository(root),
    recentHistoryRepository: createFileRecentHistoryRepository(root),
  };
});

vi.mock("../../utils/logger.js", () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

async function waitFor(condition: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!(await condition())) {
    if (Date.now() > deadline) throw new Error("waitFor timed out");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("computeFirstTokenTimeoutSeconds", () => {
  it("keeps the configured timeout for short text", () => {
    expect(computeFirstTokenTimeoutSeconds(50, 15)).toBe(15);
  });

  it("scales with text length", () => {
    expect(computeFirstTokenTimeoutSeconds(300, 15)).toBe(30);
    expect(computeFirstTokenTimeoutSeconds(200, 20)).toBe(20);
  });

  it("caps at the maximum", () => {
    expect(computeFirstTokenTimeoutSeconds(5000, 15)).toBe(120);
  });
});

describe("transformText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams chunks and appends history with full output", async () => {
    await personaRepository.write("user-1", { rows: [] });

    const chatStream = vi.fn().mockImplementation(async function* () {
      yield "Hello";
      yield " world";
    });
    vi.mocked(createLLMProvider).mockReturnValue({ chatStream } as unknown as ReturnType<
      typeof createLLMProvider
    >);

    const generator = await transformText("user-1", "raw text", []);
    const chunks: string[] = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hello", " world"]);
    expect(chatStream).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ thinkingEnabled: false }),
    );
    expect(buildTransformPrompt).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        persona: { rows: [] },
        vocabulary: "vocab-md",
        tone: TONE_PRESETS.professional,
        languages: "English, Chinese (Simplified)",
      }),
    );

    await waitFor(async () => (await historyRepository.list("user-1")).length === 1);
    const entries = await historyRepository.list("user-1");
    expect(entries[0]).toEqual(
      expect.objectContaining({
        input: "raw text",
        output: "Hello world",
      }),
    );

    await waitFor(async () => (await recentHistoryRepository.list("user-1")).length === 1);
    const recentEntries = await recentHistoryRepository.list("user-1");
    expect(recentEntries[0]).toEqual(
      expect.objectContaining({
        output: "Hello world",
      }),
    );
  });

  it("passes thinkingEnabled from config to chatStream", async () => {
    await personaRepository.write("user-2", { rows: [] });

    const chatStream = vi.fn().mockImplementation(async function* () {
      yield "ok";
    });
    vi.mocked(createLLMProvider).mockReturnValue({ chatStream } as unknown as ReturnType<
      typeof createLLMProvider
    >);

    const generator = await transformText("user-2", "raw text", []);
    for await (const _ of generator) {
      void _;
    }

    expect(chatStream).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ thinkingEnabled: false }),
    );
  });
});

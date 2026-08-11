import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMConfig } from "@tyvox/sdk/contracts";
import { TransformError } from "./errors.js";

vi.mock("./client.js", () => ({ streamChatCompletion: vi.fn() }));
vi.mock("../user-config/index.js", () => ({ getUserConfig: vi.fn() }));

import { streamChatCompletion } from "./client.js";
import { getUserConfig } from "../user-config/index.js";
import { checkLLMReadiness, createLLMProvider } from "./index.js";

const config: LLMConfig = {
  provider: "deepseek",
  apiKey: "k",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-v4-flash",
  tone: "professional",
  thinkingEnabled: false,
};

async function* fakeStream(chunks: string[]): AsyncGenerator<string> {
  for (const c of chunks) yield c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

async function* failingStream(error: Error): AsyncGenerator<string> {
  yield* [];
  throw error;
}

describe("LLMProvider", () => {
  it("chat accumulates streamed chunks", async () => {
    vi.mocked(streamChatCompletion).mockReturnValue(fakeStream(["a", "b"]));
    const provider = createLLMProvider(config);
    await expect(provider.chat([{ role: "user", content: "hi" }])).resolves.toBe("ab");
  });

  it("chat strips think tags from the final output", async () => {
    vi.mocked(streamChatCompletion).mockReturnValue(
      fakeStream(["he", "<think>secret</think>", "llo"]),
    );
    const provider = createLLMProvider(config);
    await expect(provider.chat([{ role: "user", content: "hi" }])).resolves.toBe("hello");
  });

  it("chat forwards undefined thinkingEnabled when not provided", async () => {
    vi.mocked(streamChatCompletion).mockReturnValue(fakeStream(["a"]));
    const provider = createLLMProvider(config);
    await provider.chat([{ role: "user", content: "hi" }]);
    expect(streamChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        config,
        thinkingEnabled: undefined,
      }),
    );
  });

  it("chatStream forwards options to the client", async () => {
    vi.mocked(streamChatCompletion).mockReturnValue(fakeStream(["a"]));
    const provider = createLLMProvider(config);
    const onData = vi.fn();
    const abortSignal = new AbortController().signal;
    const stream = provider.chatStream([{ role: "user", content: "hi" }], {
      onData,
      abortSignal,
      thinkingEnabled: true,
    });
    for await (const _ of stream) {
      void _;
    }
    expect(streamChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        config,
        thinkingEnabled: true,
        onData,
        abortSignal,
      }),
    );
  });

  it("propagates client errors", async () => {
    vi.mocked(streamChatCompletion).mockReturnValue(
      failingStream(new TransformError("boom", "deepseek")),
    );
    const provider = createLLMProvider(config);
    await expect(provider.chat([{ role: "user", content: "hi" }])).rejects.toThrow("boom");
  });
});

describe("checkLLMReadiness", () => {
  it("pings with thinking disabled and reports ready", async () => {
    vi.mocked(getUserConfig).mockResolvedValue({ llm: config } as never);
    vi.mocked(streamChatCompletion).mockReturnValue(fakeStream([]));
    const result = await checkLLMReadiness("default");
    expect(result.ready).toBe(true);
    expect(streamChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ thinkingEnabled: false }),
    );
    expect(streamChatCompletion).toHaveBeenCalledWith(
      expect.not.objectContaining({ maxTokens: 1 }),
    );
  });

  it("reports not ready on failure", async () => {
    vi.mocked(getUserConfig).mockResolvedValue({ llm: config } as never);
    vi.mocked(streamChatCompletion).mockReturnValue(
      failingStream(new TransformError("LLM request failed (HTTP 401): nope", "deepseek")),
    );
    const result = await checkLLMReadiness("default");
    expect(result.ready).toBe(false);
    expect(result.error).toContain("401");
  });
});

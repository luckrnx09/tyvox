import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { LLMConfig } from "@tyvox/sdk/contracts";
import { streamChatCompletion } from "./client.js";

const config: LLMConfig = {
  provider: "deepseek",
  apiKey: "sk-test",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-v4-flash",
  tone: "professional",
  thinkingEnabled: false,
};

function sseResponse(lines: string[], status = 200): Response {
  const body = lines.map((l) => `data: ${l}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(body, {
    status,
    headers: { "content-type": "text/event-stream" },
  });
}

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = "";
  for await (const chunk of gen) out += chunk;
  return out;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

it("posts chat completion with thinking disabled fields merged", async () => {
  vi.mocked(fetch).mockResolvedValue(sseResponse(['{"choices":[{"delta":{"content":"hi"}}]}']));
  await collect(
    streamChatCompletion({
      config,
      messages: [{ role: "user", content: "x" }],
      thinkingEnabled: false,
    }),
  );
  const [url, init] = vi.mocked(fetch).mock.calls[0]!;
  expect(url).toBe("https://api.deepseek.com/v1/chat/completions");
  const body = JSON.parse(String(init?.body));
  expect(body).toMatchObject({
    model: "deepseek-v4-flash",
    temperature: 0.3,
    stream: true,
    thinking: { type: "disabled" },
  });
});

it("omits thinking fields when thinkingEnabled is undefined", async () => {
  vi.mocked(fetch).mockResolvedValue(sseResponse(['{"choices":[{"delta":{"content":"hi"}}]}']));
  await collect(
    streamChatCompletion({
      config,
      messages: [{ role: "user", content: "x" }],
      thinkingEnabled: undefined,
    }),
  );
  const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]![1]?.body));
  expect("thinking" in body).toBe(false);
});

it("yields content deltas and fires onData", async () => {
  vi.mocked(fetch).mockResolvedValue(
    sseResponse([
      '{"choices":[{"delta":{"reasoning_content":"hmm"}}]}',
      '{"choices":[{"delta":{"content":"a"}}]}',
      '{"choices":[{"delta":{"content":"b"},"finish_reason":"stop"}]}',
    ]),
  );
  const onData = vi.fn();
  const out = await collect(
    streamChatCompletion({ config, messages: [], thinkingEnabled: false, onData }),
  );
  expect(out).toBe("ab");
  expect(onData).toHaveBeenCalledTimes(3);
});

it("falls back to reasoning_content when content is empty", async () => {
  vi.mocked(fetch).mockResolvedValue(
    sseResponse(['{"choices":[{"delta":{"reasoning_content":"only thinking"}}]}']),
  );
  const out = await collect(streamChatCompletion({ config, messages: [], thinkingEnabled: false }));
  expect(out).toBe("only thinking");
});

it("retries without thinking fields on 400", async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response("bad request", { status: 400 }))
    .mockResolvedValueOnce(sseResponse(['{"choices":[{"delta":{"content":"ok"}}]}']));
  const out = await collect(streamChatCompletion({ config, messages: [], thinkingEnabled: false }));
  expect(out).toBe("ok");
  const secondBody = JSON.parse(String(vi.mocked(fetch).mock.calls[1]![1]?.body));
  expect("thinking" in secondBody).toBe(false);
});

it("throws TransformError with truncated body on persistent error", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("x".repeat(1000), { status: 500 }));
  await expect(
    collect(streamChatCompletion({ config, messages: [], thinkingEnabled: false })),
  ).rejects.toThrow("HTTP 500");
});

it("throws when length-exhausted with no text", async () => {
  vi.mocked(fetch).mockResolvedValue(
    sseResponse(['{"choices":[{"delta":{"reasoning_content":"r"},"finish_reason":"length"}]}']),
  );
  await expect(
    collect(
      streamChatCompletion({
        config,
        messages: [],
        thinkingEnabled: false,
      }),
    ),
  ).rejects.toThrow("truncated");
});

it("merges extraBody for custom provider", async () => {
  vi.mocked(fetch).mockResolvedValue(sseResponse(['{"choices":[{"delta":{"content":"ok"}}]}']));
  await collect(
    streamChatCompletion({
      config: {
        ...config,
        provider: "custom",
        extraBody: '{"enable_thinking":false,"vendor":"x"}',
      },
      messages: [],
      thinkingEnabled: false,
    }),
  );
  const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]![1]?.body));
  expect(body.enable_thinking).toBe(false);
  expect(body.vendor).toBe("x");
});

it("throws TransformError on AbortError from fetch", async () => {
  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";
  vi.mocked(fetch).mockRejectedValue(abortError);
  await expect(
    collect(streamChatCompletion({ config, messages: [], thinkingEnabled: false })),
  ).rejects.toThrow("LLM request timed out");
});

it("sends max_tokens only when provided", async () => {
  vi.mocked(fetch).mockResolvedValue(sseResponse(['{"choices":[{"delta":{"content":"ok"}}]}']));
  await collect(
    streamChatCompletion({ config, messages: [], thinkingEnabled: false, maxTokens: 1 }),
  );
  const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]![1]?.body));
  expect(body.max_tokens).toBe(1);
});

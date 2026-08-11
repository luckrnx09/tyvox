import { describe, it, expect, vi, afterEach } from "vitest";
import { ProviderInitError } from "../errors.js";
import { NoSpeechError, TranscriptionError } from "./errors.js";
import { createApiASRProvider, type ApiASRSpec } from "./api-provider.js";

function createSpec(overrides?: Partial<ApiASRSpec>): ApiASRSpec {
  return {
    id: "test-api",
    config: { provider: "test-api:model-1" as never, apiKey: "key", languages: [] },
    defaultEndpoint: "https://api.example.com/v1/audio/transcriptions",
    defaultModel: "model-1",
    ...overrides,
  };
}

function stubFetch(response: Partial<Response> | (() => Promise<Partial<Response>>)) {
  const fetchMock =
    typeof response === "function"
      ? vi.fn().mockImplementation(response)
      : vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("status", () => {
  it("reports not_ready without an api key", async () => {
    const provider = createApiASRProvider(
      createSpec({ config: { provider: "test-api:model-1" as never, apiKey: "", languages: [] } }),
    );
    const status = await provider.status("model-1");
    expect(status).toEqual({ status: "not_ready", error: "API key is required" });
  });

  it("reports ready when the endpoint probe succeeds", async () => {
    stubFetch({ ok: true });
    const provider = createApiASRProvider(createSpec());
    expect(await provider.status("model-1")).toEqual({ status: "ready" });
  });

  it("reports not_ready when the endpoint is unreachable", async () => {
    stubFetch(() => Promise.reject(new Error("connection refused")));
    const provider = createApiASRProvider(createSpec());
    const status = await provider.status("model-1");
    expect(status.status).toBe("not_ready");
  });
});

describe("prepare", () => {
  it("resolves when ready", async () => {
    stubFetch({ ok: true });
    const provider = createApiASRProvider(createSpec());
    await expect(provider.prepare("model-1")).resolves.toBeUndefined();
  });

  it("throws ProviderInitError when not ready", async () => {
    stubFetch({ ok: false });
    const provider = createApiASRProvider(createSpec());
    await expect(provider.prepare("model-1")).rejects.toThrow(ProviderInitError);
  });
});

describe("transcribe", () => {
  it("posts audio to the endpoint and returns trimmed text", async () => {
    const fetchMock = stubFetch({
      ok: true,
      json: () => Promise.resolve({ text: "  hello  " }),
    });
    const provider = createApiASRProvider(createSpec());

    const result = await provider.transcribe(Buffer.alloc(100));

    expect(result.text).toBe("hello");
    expect(result.sampleCount).toBe(50);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.com/v1/audio/transcriptions");
    expect(init.headers.Authorization).toBe("Bearer key");
    expect((init.body as FormData).get("model")).toBe("model-1");
  });

  it("prefers the configured url over the default endpoint", async () => {
    const fetchMock = stubFetch({
      ok: true,
      json: () => Promise.resolve({ text: "hi" }),
    });
    const provider = createApiASRProvider(
      createSpec({
        config: {
          provider: "test-api:model-1" as never,
          apiKey: "key",
          url: "https://custom.example.com/asr",
          languages: [],
        },
      }),
    );
    await provider.transcribe(Buffer.alloc(4));
    expect(fetchMock.mock.calls[0][0]).toBe("https://custom.example.com/asr");
  });

  it("rejects with NoSpeechError on empty text", async () => {
    stubFetch({ ok: true, json: () => Promise.resolve({ text: "  " }) });
    const provider = createApiASRProvider(createSpec());
    await expect(provider.transcribe(Buffer.alloc(4))).rejects.toThrow(NoSpeechError);
  });

  it("rejects with TranscriptionError on http failure", async () => {
    stubFetch({ ok: false, status: 500, text: () => Promise.resolve("boom") });
    const provider = createApiASRProvider(createSpec());
    await expect(provider.transcribe(Buffer.alloc(4))).rejects.toThrow(TranscriptionError);
  });

  it("wraps network failures in TranscriptionError", async () => {
    stubFetch(() => Promise.reject(new Error("socket hangup")));
    const provider = createApiASRProvider(createSpec());
    await expect(provider.transcribe(Buffer.alloc(4))).rejects.toThrow(TranscriptionError);
  });
});

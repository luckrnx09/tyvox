import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "./server.js";

vi.mock("./utils/logger.js", () => ({
  getLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("./services/asr/index.js", () => ({
  listASRModels: vi.fn(),
  prepareASRModel: vi.fn(),
  checkASRReadiness: vi.fn(),
}));

vi.mock("./services/llm/index.js", () => ({
  checkLLMReadiness: vi.fn(),
}));

const { checkASRReadiness } = await import("./services/asr/index.js");
const { checkLLMReadiness } = await import("./services/llm/index.js");

describe("createApp health endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns LLM readiness for authenticated requests", async () => {
    vi.mocked(checkLLMReadiness).mockResolvedValue({ ready: true });
    const app = createApp();
    const res = await app.request("/api/llm/readiness", {
      headers: { "X-User-ID": "user-1" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true });
    expect(checkLLMReadiness).toHaveBeenCalledWith("user-1");
  });

  it("returns ASR readiness for authenticated requests", async () => {
    vi.mocked(checkASRReadiness).mockResolvedValue({ ready: false, error: "model not ready" });
    const app = createApp();
    const res = await app.request("/api/asr/readiness", {
      headers: { "X-User-ID": "user-1" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: false, error: "model not ready" });
    expect(checkASRReadiness).toHaveBeenCalledWith("user-1");
  });

  it("rejects readiness requests without X-User-ID", async () => {
    const app = createApp();
    const res = await app.request("/api/asr/readiness");
    expect(res.status).toBe(401);
  });
});

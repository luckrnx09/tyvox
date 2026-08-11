import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { loggerMiddleware } from "./logger.js";
import { getLogger } from "../utils/logger.js";

vi.mock("../utils/logger.js", () => ({
  getLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}));

function createApp() {
  const app = new Hono();
  app.use(loggerMiddleware);
  app.get("/ok", (c) => c.json({ ok: true }));
  app.get("/bad", (c) => c.json({ error: "oops" }, 500));
  return app;
}

function mockLogger() {
  const info = vi.fn();
  const error = vi.fn();
  return { info, error, logger: { info, error } as unknown as ReturnType<typeof getLogger> };
}

describe("loggerMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs successful requests with source and sessionId", async () => {
    const app = createApp();
    const { info, logger } = mockLogger();
    vi.mocked(getLogger).mockReturnValue(logger);

    const res = await app.request("/ok", {
      headers: {
        "X-Source": "desktop",
        "X-Session-Id": "session-1",
      },
    });

    expect(res.status).toBe(200);
    expect(getLogger).toHaveBeenCalledWith("desktop");
    expect(info).toHaveBeenCalledTimes(1);
    const [meta, message] = info.mock.calls[0];
    expect(meta).toMatchObject({ kind: "request", sessionId: "session-1" });
    expect(message).toMatch("GET /ok 200");
  });

  it("falls back to unknown source when header is missing", async () => {
    const app = createApp();
    const { logger } = mockLogger();
    vi.mocked(getLogger).mockReturnValue(logger);

    await app.request("/ok");

    expect(getLogger).toHaveBeenCalledWith("unknown");
  });

  it("logs error responses with body", async () => {
    const app = createApp();
    const { error, logger } = mockLogger();
    vi.mocked(getLogger).mockReturnValue(logger);

    await app.request("/bad", { headers: { "X-Source": "desktop" } });

    expect(error).toHaveBeenCalledTimes(1);
    const [meta, message] = error.mock.calls[0];
    expect(meta).toMatchObject({ kind: "request", sessionId: undefined });
    expect(meta.body).toBe('{"error":"oops"}');
    expect(message).toMatch("GET /bad 500");
  });
});

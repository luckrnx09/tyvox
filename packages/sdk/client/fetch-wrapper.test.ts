import { afterEach, describe, expect, it, vi } from "vitest";
import { customFetch } from "./fetch-wrapper.js";

describe("customFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with undefined data for empty response bodies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const result = await customFetch<{ data: unknown; status: number }>("/api/test", {
      method: "POST",
    });
    expect(result.data).toBeUndefined();
    expect(result.status).toBe(200);
  });

  it("parses JSON response bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ vocabulary: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const result = await customFetch<{ data: { vocabulary: unknown } }>("/api/test", {
      method: "GET",
    });
    expect(result.data).toEqual({ vocabulary: {} });
  });

  it("throws ApiError for non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { code: "X", message: "boom" } }), { status: 400 }),
        ),
    );
    await expect(customFetch("/api/test", { method: "GET" })).rejects.toThrow("boom");
  });
});

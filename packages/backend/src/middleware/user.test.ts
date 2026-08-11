import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { onError, type AppEnv } from "@tyvox/sdk/server";
import { userMiddleware } from "./user.js";

function createTestApp() {
  const app = new Hono<AppEnv>();
  app.onError(onError);
  app.use("*", userMiddleware);
  app.get("/", (c) => c.json({ userId: c.get("user").id }));
  return app;
}

describe("userMiddleware", () => {
  it("rejects requests without X-User-ID", async () => {
    const res = await createTestApp().request("/");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_USER_ID");
  });

  it("exposes the user id on the context", async () => {
    const res = await createTestApp().request("/", { headers: { "X-User-ID": "alice" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "alice" });
  });

  it("rejects user ids with path traversal characters", async () => {
    const res = await createTestApp().request("/", {
      headers: { "X-User-ID": "../../etc" },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_USER_ID");
  });

  it("rejects overlong user ids", async () => {
    const res = await createTestApp().request("/", {
      headers: { "X-User-ID": "a".repeat(65) },
    });
    expect(res.status).toBe(400);
  });
});

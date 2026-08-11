import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { AppError, onError } from "./index.js";

function testServiceError(code: string, message: string) {
  const err = new Error(message);
  Object.defineProperty(err, "code", { value: code, enumerable: true });
  Object.defineProperty(err, "recoverable", { value: true, enumerable: true });
  return err;
}

function createTestApp(routeAction: () => Response | Promise<Response>) {
  const app = new Hono();
  app.onError(onError);
  app.get("/", (_c) => routeAction());
  return app;
}

describe("onError", () => {
  it("passes through on success", async () => {
    const app = createTestApp(() => new Response("ok"));
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("handles AppError with custom status", async () => {
    const app = createTestApp(() => {
      throw new AppError("CUSTOM_ERR", "custom message", 400);
    });
    const res = await app.request("/");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toEqual({ code: "CUSTOM_ERR", message: "custom message" });
  });

  it("handles AppError with default 500 status", async () => {
    const app = createTestApp(() => {
      throw new AppError("DEFAULT_CODE", "default message");
    });
    const res = await app.request("/");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toEqual({ code: "DEFAULT_CODE", message: "default message" });
  });

  it("handles NoSpeechError as 422", async () => {
    const app = createTestApp(() => {
      throw testServiceError("NO_SPEECH_DETECTED", "No speech detected in audio");
    });
    const res = await app.request("/");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toEqual({
      code: "NO_SPEECH_DETECTED",
      message: "No speech detected in audio",
    });
  });

  it("handles TranscriptionError as 502", async () => {
    const app = createTestApp(() => {
      throw testServiceError("TRANSCRIPTION_ERROR", "whisper failed to start");
    });
    const res = await app.request("/");
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toEqual({
      code: "TRANSCRIPTION_ERROR",
      message: "whisper failed to start",
    });
  });

  it("handles ProviderNotAvailableError as 503", async () => {
    const app = createTestApp(() => {
      throw testServiceError("PROVIDER_NOT_AVAILABLE", "provider not installed");
    });
    const res = await app.request("/");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toEqual({
      code: "PROVIDER_NOT_AVAILABLE",
      message: "provider not installed",
    });
  });

  it("handles unknown errors as 500", async () => {
    const app = createTestApp(() => {
      throw new Error("something broke");
    });
    const res = await app.request("/");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toEqual({ code: "INTERNAL_ERROR", message: "Internal server error" });
  });

  it("handles errors with code but no known mapping as 500", async () => {
    const app = createTestApp(() => {
      throw testServiceError("UNKNOWN_SERVICE_CODE", "unknown service error");
    });
    const res = await app.request("/");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toEqual({ code: "UNKNOWN_SERVICE_CODE", message: "unknown service error" });
  });
});

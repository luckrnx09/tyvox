import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useTransform } from "./useTransform";

const encoder = new TextEncoder();

function createSSEResponse(events: { event: string; data: unknown }[]) {
  const chunks = events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);

  return new Response(
    new ReadableStream({
      start(controller) {
        let i = 0;
        const push = () => {
          if (i >= chunks.length) {
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(chunks[i]));
          i += 1;
          setTimeout(push, 30);
        };
        push();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}

describe("useTransform", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("consumes chunk events and returns full text", async () => {
    const { result } = renderHook(() => useTransform());

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createSSEResponse([
        { event: "thinking", data: {} },
        { event: "chunk", data: { text: "hello " } },
        { event: "chunk", data: { text: "world" } },
        { event: "done", data: { text: "hello world" } },
      ]),
    );

    let textPromise: Promise<string>;
    act(() => {
      textPromise = result.current.transform("input", []);
    });
    expect(result.current.state).toBe("thinking");

    const text = await act(async () => await textPromise);
    expect(text).toBe("hello world");
    await waitFor(() => expect(result.current.state).toBe("done"));
  });

  it("rejects on error event", async () => {
    const { result } = renderHook(() => useTransform());

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createSSEResponse([
        { event: "thinking", data: {} },
        { event: "error", data: { code: "TRANSFORM_FAILED", message: "fail" } },
      ]),
    );

    await act(async () => {
      try {
        await result.current.transform("input", []);
        throw new Error("expected transform to reject");
      } catch (error) {
        expect((error as Error).message).toBe("fail");
      }
    });
    await waitFor(() => expect(result.current.state).toBe("error"));
  });

  it("tracks progress and caps at 99% before done", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useTransform());

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createSSEResponse([
        { event: "thinking", data: {} },
        { event: "chunk", data: { text: "short" } },
        { event: "done", data: { text: "short" } },
      ]),
    );

    const input = "a much longer input string";
    act(() => {
      result.current.transform(input, []);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });
    await waitFor(() => expect(result.current.state).toBe("streaming"));
    expect(result.current.progress).toBeLessThan(1);
    expect(result.current.progress).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });
    await waitFor(() => expect(result.current.state).toBe("done"));
    expect(result.current.progress).toBe(1);
  });
});

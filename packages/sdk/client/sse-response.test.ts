import { describe, expect, it } from "vitest";
import { SSEResponse } from "./sse-response.js";

describe("SSEResponse", () => {
  it("parses a text/event-stream response into events", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: chunk\ndata: {"text":"a"}\n\n'));
        controller.enqueue(encoder.encode('event: done\ndata: {"text":"ab"}\n\n'));
        controller.close();
      },
    });

    const response = new Response(stream, {
      headers: { "content-type": "text/event-stream" },
    });

    const events: Array<{ event: string; data: unknown }> = [];
    for await (const event of new SSEResponse(response)) {
      events.push(event as { event: string; data: unknown });
    }

    expect(events).toEqual([
      { event: "chunk", data: { text: "a" } },
      { event: "done", data: { text: "ab" } },
    ]);
  });
});

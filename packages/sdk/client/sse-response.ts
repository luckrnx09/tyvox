const SSE_LINE_ENDING = "\r\n";
const SSE_LINE_FEED = "\n";
const SSE_BLOCK_SEPARATOR = "\n\n";
const SSE_EVENT_PREFIX = "event: ";
const SSE_DATA_PREFIX = "data: ";

export interface SSEEvent<T = unknown> {
  event: string;
  data: T;
}

export class SSEResponse<T> implements AsyncIterable<T> {
  readonly status: number;
  readonly headers: Headers;
  readonly response: Response;

  constructor(response: Response) {
    this.response = response;
    this.status = response.status;
    this.headers = response.headers;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    if (!this.response.body) throw new Error("Response body is null");
    const reader = this.response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventName = "";
    const dataLines: string[] = [];

    const flushEvent = (): T | null => {
      if (dataLines.length === 0) return null;
      const data = dataLines.join(SSE_LINE_FEED);
      dataLines.length = 0;
      const event = eventName;
      eventName = "";
      try {
        return { event, data: JSON.parse(data) } as T;
      } catch {
        return null;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const event = flushEvent();
        if (event) yield event;
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      const normalized = buffer.replaceAll(SSE_LINE_ENDING, SSE_LINE_FEED);
      const blocks = normalized.split(SSE_BLOCK_SEPARATOR);
      buffer = blocks.pop()!;

      for (const block of blocks) {
        eventName = "";
        for (const line of block.split(SSE_LINE_FEED)) {
          if (line.startsWith(SSE_EVENT_PREFIX)) {
            eventName = line.slice(SSE_EVENT_PREFIX.length);
          } else if (line.startsWith(SSE_DATA_PREFIX)) {
            dataLines.push(line.slice(SSE_DATA_PREFIX.length));
          }
        }
        const event = flushEvent();
        if (event) yield event;
      }
    }
  }
}

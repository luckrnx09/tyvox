export interface AudioChunkBatcherOptions {
  maxDelayMs: number;
  maxBytes: number;
  onFlush: (buffer: ArrayBuffer) => void | Promise<void>;
}

export class AudioChunkBatcher {
  #options: AudioChunkBatcherOptions;
  #buffer: ArrayBuffer[] = [];
  #byteLength = 0;
  #pendingBuffer: ArrayBuffer[] = [];
  #pendingByteLength = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #flushing = false;
  #flushPromise: Promise<void> | null = null;
  #disposed = false;

  constructor(options: AudioChunkBatcherOptions) {
    this.#options = options;
  }

  push(chunk: ArrayBuffer): void {
    if (this.#disposed) return;
    if (this.#flushing) {
      this.#pendingBuffer.push(chunk);
      this.#pendingByteLength += chunk.byteLength;
      return;
    }
    this.#buffer.push(chunk);
    this.#byteLength += chunk.byteLength;
    if (this.#buffer.length === 1) {
      this.#timer = setTimeout(() => void this.flush(), this.#options.maxDelayMs);
    }
    if (this.#byteLength >= this.#options.maxBytes) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.#flushing) {
      return this.#flushPromise ?? Promise.resolve();
    }
    if (this.#buffer.length === 0) return;
    this.#clearTimer();
    this.#flushPromise = this.#runFlush();
    try {
      await this.#flushPromise;
    } finally {
      this.#flushPromise = null;
    }
  }

  async #runFlush(): Promise<void> {
    this.#flushing = true;
    const chunks = this.#buffer;
    const totalLength = this.#byteLength;
    this.#buffer = [];
    this.#byteLength = 0;
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    try {
      await this.#options.onFlush(combined.buffer);
    } finally {
      this.#flushing = false;
      if (!this.#disposed) {
        this.#drainPending();
      }
    }
  }

  #drainPending(): void {
    if (this.#pendingBuffer.length === 0) return;
    this.#buffer = this.#pendingBuffer;
    this.#byteLength = this.#pendingByteLength;
    this.#pendingBuffer = [];
    this.#pendingByteLength = 0;
    void this.flush();
  }

  #clearTimer(): void {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }

  dispose(): void {
    this.#disposed = true;
    this.#clearTimer();
    this.#buffer = [];
    this.#byteLength = 0;
    this.#pendingBuffer = [];
    this.#pendingByteLength = 0;
  }
}

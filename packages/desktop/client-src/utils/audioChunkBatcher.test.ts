import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioChunkBatcher } from "./audioChunkBatcher";

describe("AudioChunkBatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("flushes when maxDelayMs elapses", async () => {
    const onFlush = vi.fn();
    const batcher = new AudioChunkBatcher({ maxDelayMs: 2000, maxBytes: 65536, onFlush });
    const chunk = new ArrayBuffer(100);
    batcher.push(chunk);
    expect(onFlush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(onFlush).toHaveBeenCalledOnce();
    expect(onFlush.mock.calls[0]![0].byteLength).toBe(100);
  });

  it("flushes when maxBytes is reached", async () => {
    const onFlush = vi.fn();
    const batcher = new AudioChunkBatcher({ maxDelayMs: 2000, maxBytes: 100, onFlush });
    batcher.push(new ArrayBuffer(50));
    expect(onFlush).not.toHaveBeenCalled();
    batcher.push(new ArrayBuffer(50));
    await Promise.resolve();
    expect(onFlush).toHaveBeenCalledOnce();
    expect(onFlush.mock.calls[0]![0].byteLength).toBe(100);
  });

  it("flushes immediately on flush()", async () => {
    const onFlush = vi.fn();
    const batcher = new AudioChunkBatcher({ maxDelayMs: 2000, maxBytes: 65536, onFlush });
    batcher.push(new ArrayBuffer(10));
    await batcher.flush();
    expect(onFlush).toHaveBeenCalledOnce();
  });

  it("queues chunks received while a flush is in flight and flushes them after", async () => {
    let resolveFlush: (() => void) | null = null;
    const onFlush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFlush = resolve;
        }),
    );
    const batcher = new AudioChunkBatcher({ maxDelayMs: 2000, maxBytes: 65536, onFlush });
    batcher.push(new ArrayBuffer(10));
    const flushPromise = batcher.flush();
    batcher.push(new ArrayBuffer(20));
    batcher.push(new ArrayBuffer(30));
    resolveFlush!();
    await flushPromise;
    await Promise.resolve();
    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush.mock.calls[0]![0].byteLength).toBe(10);
    expect(onFlush.mock.calls[1]![0].byteLength).toBe(50);
  });

  it("flush waits for an in-progress flush to complete", async () => {
    let resolveFlush: (() => void) | null = null;
    const onFlush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFlush = resolve;
        }),
    );
    const batcher = new AudioChunkBatcher({ maxDelayMs: 2000, maxBytes: 65536, onFlush });
    batcher.push(new ArrayBuffer(10));
    const flushPromise1 = batcher.flush();
    const flushPromise2 = batcher.flush();
    resolveFlush!();
    await Promise.all([flushPromise1, flushPromise2]);
    expect(onFlush).toHaveBeenCalledOnce();
  });

  it("does not flush when empty", async () => {
    const onFlush = vi.fn();
    const batcher = new AudioChunkBatcher({ maxDelayMs: 2000, maxBytes: 65536, onFlush });
    await batcher.flush();
    vi.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(onFlush).not.toHaveBeenCalled();
  });

  it("concatenates chunks in order", async () => {
    const onFlush = vi.fn();
    const batcher = new AudioChunkBatcher({ maxDelayMs: 2000, maxBytes: 65536, onFlush });
    const a = new Uint8Array([1, 2, 3]).buffer;
    const b = new Uint8Array([4, 5]).buffer;
    batcher.push(a);
    batcher.push(b);
    await batcher.flush();
    const result = new Uint8Array(onFlush.mock.calls[0]![0]);
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
  });
});

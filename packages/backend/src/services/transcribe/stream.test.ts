import { test, expect, vi, afterEach } from "vitest";
import { appendChunk, assembleAndCleanup } from "./stream.js";
import { randomUUID } from "node:crypto";

function pcm(bytes: number[]): Buffer {
  return Buffer.from(bytes);
}

afterEach(() => {
  vi.useRealTimers();
});

test("assembles chunks in send order into a wav buffer", async () => {
  const sessionId = randomUUID();
  await appendChunk("alice", sessionId, pcm([1, 2, 3]));
  await appendChunk("alice", sessionId, pcm([4, 5]));

  const wav = await assembleAndCleanup("alice", sessionId);

  expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(wav.readUInt32LE(40)).toBe(5);
  expect([...wav.subarray(44)]).toEqual([1, 2, 3, 4, 5]);
});

test("reports accumulated received bytes", async () => {
  const sessionId = randomUUID();
  expect(await appendChunk("alice", sessionId, pcm([1, 2, 3]))).toBe(3);
  expect(await appendChunk("alice", sessionId, pcm([4, 5]))).toBe(5);
  await assembleAndCleanup("alice", sessionId);
});

test("pads one sample when the pcm length is VAD-window aligned", async () => {
  const sessionId = randomUUID();
  await appendChunk("alice", sessionId, Buffer.alloc(1024));

  const wav = await assembleAndCleanup("alice", sessionId);

  expect(wav.readUInt32LE(40)).toBe(1026);
  expect(wav.length).toBe(44 + 1026);
});

test("rejects finalize for unknown session", async () => {
  await expect(assembleAndCleanup("alice", randomUUID())).rejects.toThrow("No speech detected");
});

test("cleans up session after finalize", async () => {
  const sessionId = randomUUID();
  await appendChunk("alice", sessionId, pcm([1]));
  await assembleAndCleanup("alice", sessionId);
  await expect(assembleAndCleanup("alice", sessionId)).rejects.toThrow("No speech detected");
});

test("rejects chunks from a different user for an existing session", async () => {
  const sessionId = randomUUID();
  await appendChunk("alice", sessionId, pcm([1]));

  await expect(appendChunk("bob", sessionId, pcm([2]))).rejects.toThrow("No speech detected");
  await expect(assembleAndCleanup("bob", sessionId)).rejects.toThrow("No speech detected");

  await assembleAndCleanup("alice", sessionId);
});

test("rejects recordings exceeding the maximum size", async () => {
  const sessionId = randomUUID();
  const maxBytes = 32 * 1024 * 1024;
  await appendChunk("alice", sessionId, Buffer.alloc(maxBytes - 1));

  await expect(appendChunk("alice", sessionId, pcm([1, 1]))).rejects.toThrow(
    "Recording exceeds the maximum length",
  );
  await expect(assembleAndCleanup("alice", sessionId)).rejects.toThrow("No speech detected");
});

test("expires sessions idle beyond the ttl", async () => {
  vi.useFakeTimers();
  const sessionId = randomUUID();
  await appendChunk("alice", sessionId, pcm([1]));

  vi.advanceTimersByTime(11 * 60 * 1000);

  await expect(assembleAndCleanup("alice", sessionId)).rejects.toThrow("No speech detected");
});

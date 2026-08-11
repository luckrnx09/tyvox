import { test, expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileRecentHistoryRepository, RECENT_HISTORY_WINDOW_MS } from "./recent-history.js";
import type { RecentHistoryEntry } from "./types.js";

function entry(output: string, timestamp: string): RecentHistoryEntry {
  return { output, timestamp };
}

test("adds and lists entries in order", async () => {
  const dir = await mkdtemp(join(tmpdir(), "recent-history-"));
  const repository = createFileRecentHistoryRepository(dir);

  await repository.add("u1", entry("first record", new Date().toISOString()));
  await repository.add("u1", entry("second record", new Date().toISOString()));

  const entries = await repository.list("u1");
  expect(entries.map((e) => e.output)).toEqual(["first record", "second record"]);
});

test("lists empty for unknown user", async () => {
  const dir = await mkdtemp(join(tmpdir(), "recent-history-"));
  const repository = createFileRecentHistoryRepository(dir);
  expect(await repository.list("nobody")).toEqual([]);
});

test("prunes entries outside the window on add", async () => {
  const dir = await mkdtemp(join(tmpdir(), "recent-history-"));
  const repository = createFileRecentHistoryRepository(dir);
  const stale = new Date(Date.now() - RECENT_HISTORY_WINDOW_MS - 60_000).toISOString();

  await repository.add("u1", entry("stale record", stale));
  await repository.add("u1", entry("fresh record", new Date().toISOString()));

  const entries = await repository.list("u1");
  expect(entries.map((e) => e.output)).toEqual(["fresh record"]);
});

test("keeps entries of other users isolated", async () => {
  const dir = await mkdtemp(join(tmpdir(), "recent-history-"));
  const repository = createFileRecentHistoryRepository(dir);

  await repository.add("u1", entry("first record", new Date().toISOString()));
  await repository.add("u2", entry("second record", new Date().toISOString()));

  expect((await repository.list("u1")).map((e) => e.output)).toEqual(["first record"]);
  expect((await repository.list("u2")).map((e) => e.output)).toEqual(["second record"]);
});

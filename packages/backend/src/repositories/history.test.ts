import { test, expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileHistoryRepository } from "./history.js";
import type { HistoryEntry } from "./types.js";

function entry(id: string, output: string): HistoryEntry {
  return { id, input: "a", output, duration: 1, timestamp: "2026-07-16T00:00:00Z" };
}

test("adds and lists entries in order", async () => {
  const dir = await mkdtemp(join(tmpdir(), "history-"));
  const repository = createFileHistoryRepository(dir);

  await repository.add("u1", entry("1", "first record here"));
  await repository.add("u1", entry("2", "second record here"));

  const entries = await repository.list("u1");
  expect(entries.map((e) => e.id)).toEqual(["1", "2"]);
  expect(entries[0]).toEqual(entry("1", "first record here"));
});

test("lists empty for unknown user", async () => {
  const dir = await mkdtemp(join(tmpdir(), "history-"));
  const repository = createFileHistoryRepository(dir);
  expect(await repository.list("nobody")).toEqual([]);
});

test("keeps entries of other users isolated", async () => {
  const dir = await mkdtemp(join(tmpdir(), "history-"));
  const repository = createFileHistoryRepository(dir);

  await repository.add("u1", entry("1", "first record here"));
  await repository.add("u2", entry("2", "second record here"));

  expect((await repository.list("u1")).map((e) => e.id)).toEqual(["1"]);
  expect((await repository.list("u2")).map((e) => e.id)).toEqual(["2"]);
});

test("deletes entries by ids", async () => {
  const dir = await mkdtemp(join(tmpdir(), "history-"));
  const repository = createFileHistoryRepository(dir);
  const path = join(dir, "u1", "history.jsonl");

  await repository.add("u1", entry("1", "first record here"));
  await repository.add("u1", entry("2", "second record here"));
  await repository.add("u1", entry("3", "third record here"));
  await repository.delete("u1", ["1", "3"]);

  const entries = await repository.list("u1");
  expect(entries.map((e) => e.id)).toEqual(["2"]);
  const raw = await readFile(path, "utf8");
  expect(raw).not.toMatch(/"1"/);
});

test("delete on missing file is a no-op", async () => {
  const dir = await mkdtemp(join(tmpdir(), "history-"));
  const repository = createFileHistoryRepository(dir);
  await repository.delete("nobody", ["1"]);
  expect(await repository.list("nobody")).toEqual([]);
});

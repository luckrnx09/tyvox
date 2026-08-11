import { test, expect } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileVocabularyRepository } from "./vocabulary.js";

test("adds and reads entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["Claude Code"]);
  const data = await repository.read("u1");
  expect(data.vocabulary["Claude Code"].freq).toBe(1);
});

test("reads empty data for unknown user", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  expect(await repository.read("nobody")).toEqual({ vocabulary: {} });
});

test("add accumulates frequency on repeat occurrences", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["Claude Code"]);
  await repository.add("u1", ["Claude Code"]);
  const data = await repository.read("u1");
  expect(data.vocabulary["Claude Code"].freq).toBe(2);
});

test("add re-keys to most recent casing on case-insensitive match", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["claude code"]);
  await repository.add("u1", ["Claude Code"]);
  const data = await repository.read("u1");
  expect(data.vocabulary["Claude Code"].freq).toBe(2);
  expect(data.vocabulary["claude code"]).toBeUndefined();
});

test("add skips blank entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["", "   "]);
  expect(await repository.read("u1")).toEqual({ vocabulary: {} });
});

test("deletes entries case-insensitively", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["Claude Code"]);
  await repository.delete("u1", "claude code");
  expect(await repository.read("u1")).toEqual({ vocabulary: {} });
});

test("rename preserves frequency", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["claude code", "claude code", "claude code"]);
  await repository.rename("u1", "claude code", "Claude Code");
  const data = await repository.read("u1");
  expect(data.vocabulary["Claude Code"].freq).toBe(3);
  expect(data.vocabulary["claude code"]).toBeUndefined();
});

test("rename merges frequency when target exists", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["claude code", "claude code"]);
  await repository.add("u1", ["Claude Code"]);
  await repository.rename("u1", "claude code", "Claude Code");
  const data = await repository.read("u1");
  expect(data.vocabulary["Claude Code"].freq).toBe(3);
});

test("rename of unknown entry is a no-op", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["Claude Code"]);
  await repository.rename("u1", "unknown", "other");
  const data = await repository.read("u1");
  expect(Object.keys(data.vocabulary)).toEqual(["Claude Code"]);
});

test("clear removes all entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["Claude Code"]);
  await repository.clear("u1");
  expect(await repository.read("u1")).toEqual({ vocabulary: {} });
});

test("backfills missing lastSeen for legacy data and persists it", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const userDir = join(dir, "u1");
  await mkdir(userDir, { recursive: true });
  const path = join(userDir, "vocabulary.json");
  await writeFile(path, JSON.stringify({ vocabulary: { "legacy entry": { freq: 1 } } }));

  const repository = createFileVocabularyRepository(dir);
  const data = await repository.read("u1");
  expect(data.vocabulary["legacy entry"].lastSeen).toBeTruthy();

  const raw = JSON.parse(await readFile(path, "utf8"));
  expect(raw.vocabulary["legacy entry"].lastSeen).toBeTruthy();
});

test("keeps entries of other users isolated", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vocab-"));
  const repository = createFileVocabularyRepository(dir);
  await repository.add("u1", ["Claude Code"]);
  expect(await repository.read("u2")).toEqual({ vocabulary: {} });
});

import { test, expect, vi } from "vitest";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileVocabularyRepository } from "../../repositories/vocabulary.js";
import {
  getVocabulary,
  addEntry,
  deleteEntry,
  renameEntry,
  clearVocabulary,
  getPromotedVocabulary,
  getVocabularyMarkdown,
} from "./index.js";
import * as repositories from "../../repositories/index.js";

vi.mock("../../repositories/index.js", async () => {
  const root = await mkdtemp(join(tmpdir(), "vocab-service-"));
  return { vocabularyRepository: createFileVocabularyRepository(root), testUsersRoot: root };
});

const { testUsersRoot } = repositories as unknown as { testUsersRoot: string };

test("getVocabulary returns empty vocabulary", async () => {
  const result = await getVocabulary("u-empty");
  expect(result.vocabulary).toEqual({});
});

test("addEntry and deleteEntry update vocabulary", async () => {
  await addEntry("u-crud", "Claude Code");
  const afterAdd = await getVocabulary("u-crud");
  expect(afterAdd.vocabulary["Claude Code"]).toBe(1);
  await deleteEntry("u-crud", "Claude Code");
  const afterDelete = await getVocabulary("u-crud");
  expect(afterDelete.vocabulary["Claude Code"]).toBeUndefined();
});

test("renameEntry preserves frequency", async () => {
  await addEntry("u-rename", "claude code");
  await addEntry("u-rename", "claude code");
  await addEntry("u-rename", "claude code");
  await renameEntry("u-rename", "claude code", "Claude Code");
  const result = await getVocabulary("u-rename");
  expect(result.vocabulary["Claude Code"]).toBe(3);
  expect(result.vocabulary["claude code"]).toBeUndefined();
});

test("clearVocabulary removes vocabulary", async () => {
  await addEntry("u-clear", "Claude Code");
  await clearVocabulary("u-clear");
  const result = await getVocabulary("u-clear");
  expect(result.vocabulary).toEqual({});
});

test("getPromotedVocabulary sorts by frequency and caps at 30", async () => {
  for (let i = 0; i < 31; i++) {
    await addEntry("u-promoted", `entry-${i}`);
    for (let j = 0; j < i; j++) {
      await addEntry("u-promoted", `entry-${i}`);
    }
  }
  const promoted = await getPromotedVocabulary("u-promoted");
  expect(promoted).toHaveLength(30);
  expect(promoted[0]).toBe("entry-30");
  expect(promoted).not.toContain("entry-0");
});

test("getPromotedVocabulary excludes stale entries unseen for over 30 days", async () => {
  const userDir = join(testUsersRoot, "u-stale");
  await mkdir(userDir, { recursive: true });
  const staleDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  await writeFile(
    join(userDir, "vocabulary.json"),
    JSON.stringify({
      vocabulary: {
        "stale entry": { freq: 100, lastSeen: staleDate },
        "fresh entry": { freq: 1, lastSeen: new Date().toISOString() },
      },
    }),
  );
  const promoted = await getPromotedVocabulary("u-stale");
  expect(promoted).toContain("fresh entry");
  expect(promoted).not.toContain("stale entry");
});

test("getVocabularyMarkdown renders promoted entries as list", async () => {
  await addEntry("u-markdown", "Claude Code");
  expect(await getVocabularyMarkdown("u-markdown")).toBe("- Claude Code");
  expect(await getVocabularyMarkdown("u-empty-md")).toBe("");
});

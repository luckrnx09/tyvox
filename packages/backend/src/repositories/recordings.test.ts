import { test, expect } from "vitest";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileRecordingRepository } from "./recordings.js";

test("saves the wav under the user recordings directory", async () => {
  const dir = await mkdtemp(join(tmpdir(), "recordings-"));
  const repository = createFileRecordingRepository(dir);

  const path = await repository.save("u1", "session-1", Buffer.from("wav-data"));

  expect(path.startsWith(join(dir, "u1", "recordings"))).toBe(true);
  expect(path).toMatch(/-session-1\.wav$/);
  expect(await readFile(path)).toEqual(Buffer.from("wav-data"));
});

test("keeps only the five most recent recordings", async () => {
  const dir = await mkdtemp(join(tmpdir(), "recordings-"));
  const repository = createFileRecordingRepository(dir);

  for (let i = 0; i < 7; i++) {
    await repository.save("u1", `session-${i}`, Buffer.from(`wav-${i}`));
    await new Promise((resolve) => setTimeout(resolve, 2));
  }

  const files = (await readdir(join(dir, "u1", "recordings"))).sort();
  expect(files).toHaveLength(5);
  expect(files.join(",")).not.toContain("session-0");
  expect(files.join(",")).not.toContain("session-1");
  expect(files.join(",")).toContain("session-6");
});

test("keeps recordings of other users isolated", async () => {
  const dir = await mkdtemp(join(tmpdir(), "recordings-"));
  const repository = createFileRecordingRepository(dir);

  for (let i = 0; i < 6; i++) {
    await repository.save("u1", `session-${i}`, Buffer.from(`wav-${i}`));
  }
  await repository.save("u2", "session-x", Buffer.from("wav-x"));

  expect(await readdir(join(dir, "u1", "recordings"))).toHaveLength(5);
  expect(await readdir(join(dir, "u2", "recordings"))).toHaveLength(1);
});

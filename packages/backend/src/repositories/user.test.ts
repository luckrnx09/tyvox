import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileUserRepository } from "./user.js";

test("lists only user directories", async () => {
  const dir = await mkdtemp(join(tmpdir(), "users-"));
  await mkdir(join(dir, "alice"));
  await mkdir(join(dir, "bob"));
  await writeFile(join(dir, "stray-file.txt"), "x");
  const repository = createFileUserRepository(dir);
  expect((await repository.list()).sort()).toEqual(["alice", "bob"]);
});

test("lists empty when root missing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "users-"));
  const repository = createFileUserRepository(join(dir, "nonexistent"));
  expect(await repository.list()).toEqual([]);
});

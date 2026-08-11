import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileUserConfigRepository, DEFAULT_CONFIG } from "./user-config.js";

it("reads defaults when file missing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "config-"));
  const repository = createFileUserConfigRepository(dir);
  expect(await repository.read("nobody")).toEqual(DEFAULT_CONFIG);
});

it("returned defaults are isolated copies", async () => {
  const dir = await mkdtemp(join(tmpdir(), "config-"));
  const repository = createFileUserConfigRepository(dir);
  const first = await repository.read("u1");
  first.llm.model = "mutated";
  const second = await repository.read("u1");
  expect(second.llm.model).toBe(DEFAULT_CONFIG.llm.model);
});

it("writes and reads config", async () => {
  const dir = await mkdtemp(join(tmpdir(), "config-"));
  const repository = createFileUserConfigRepository(dir);
  const config = structuredClone(DEFAULT_CONFIG);
  config.llm.model = "test-model";
  await repository.write("u1", config);
  expect((await repository.read("u1")).llm.model).toBe("test-model");
});

it("rejects invalid config on read", async () => {
  const dir = await mkdtemp(join(tmpdir(), "config-"));
  const userDir = join(dir, "u1");
  await mkdir(userDir, { recursive: true });
  await writeFile(join(userDir, "config.json"), JSON.stringify({ version: "nope" }));
  const repository = createFileUserConfigRepository(dir);
  await expect(repository.read("u1")).rejects.toThrow();
});

it("rejects invalid config on write", async () => {
  const dir = await mkdtemp(join(tmpdir(), "config-"));
  const repository = createFileUserConfigRepository(dir);
  const invalid = { ...DEFAULT_CONFIG, version: "nope" };
  await expect(
    repository.write("u1", invalid as unknown as Parameters<typeof repository.write>[1]),
  ).rejects.toThrow();
});

it("returns defaults when config file is missing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tyvox-config-"));
  const repo = createFileUserConfigRepository(dir);
  const config = await repo.read("default");
  expect(config.llm.provider).toBe("ollama");
  expect(config.llm.thinkingEnabled).toBe(false);
});

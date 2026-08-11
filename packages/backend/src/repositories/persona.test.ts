import { test, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFilePersonaRepository } from "./persona.js";
import type { Persona } from "./types.js";

const emptyPersona: Persona = { rows: [] };

function row(partial: {
  id?: string;
  category: "role" | "topic" | "tools";
  fact: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? "r1",
    category: partial.category,
    fact: partial.fact,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

test("reads empty persona for unknown user", async () => {
  const dir = await mkdtemp(join(tmpdir(), "persona-"));
  const repository = createFilePersonaRepository(dir);
  expect(await repository.read("nobody")).toEqual(emptyPersona);
});

test("writes and reads persona", async () => {
  const dir = await mkdtemp(join(tmpdir(), "persona-"));
  const repository = createFilePersonaRepository(dir);
  const persona: Persona = {
    rows: [row({ id: "r1", category: "role", fact: "software engineer" })],
  };
  await repository.write("u1", persona);
  expect(await repository.read("u1")).toEqual(persona);
});

test("treats legacy plain text as empty", async () => {
  const dir = await mkdtemp(join(tmpdir(), "persona-"));
  const repository = createFilePersonaRepository(dir);
  await repository.write("u1", { rows: [] });
  await writeFile(join(dir, "u1", "persona.md"), "Software engineer who dictates in Chinese.");
  expect(await repository.read("u1")).toEqual(emptyPersona);
});

test("rejects fact containing a newline", async () => {
  const dir = await mkdtemp(join(tmpdir(), "persona-"));
  const repository = createFilePersonaRepository(dir);
  const persona: Persona = {
    rows: [row({ category: "role", fact: "engineer\nscientist" })],
  };
  await expect(repository.write("u1", persona)).rejects.toThrow("single line");
});

test("rejects persona with too many rows", async () => {
  const dir = await mkdtemp(join(tmpdir(), "persona-"));
  const repository = createFilePersonaRepository(dir);
  const rows = Array.from({ length: 11 }, (_, i) =>
    row({ id: `r${i}`, category: "tools", fact: "x" }),
  );
  await expect(repository.write("u1", { rows })).rejects.toThrow("max rows");
});

test("rejects persona row exceeding max line length", async () => {
  const dir = await mkdtemp(join(tmpdir(), "persona-"));
  const repository = createFilePersonaRepository(dir);
  const persona: Persona = { rows: [row({ category: "role", fact: "a".repeat(38) })] };
  await expect(repository.write("u1", persona)).rejects.toThrow("max length");
});

test("rejects persona exceeding total length", async () => {
  const dir = await mkdtemp(join(tmpdir(), "persona-"));
  const repository = createFilePersonaRepository(dir);
  const rows = Array.from({ length: 10 }, (_, i) =>
    row({ id: `r${i}`, category: "tools", fact: "x".repeat(33) }),
  );
  await expect(repository.write("u1", { rows })).rejects.toThrow("max total length");
});

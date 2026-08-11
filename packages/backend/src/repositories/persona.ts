import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { Persona, PersonaCategory, PersonaRepository, PersonaRow } from "./types.js";
import { serializePersonaRows, validatePersona } from "./persona-validation.js";
import { isFileMissing, writeFileAtomic } from "./fs.js";
import { getLogger } from "../utils/logger.js";

const PERSONA_FILE = "persona.md";

const personaLogger = getLogger("persona-repository");

export function createFilePersonaRepository(usersRoot: string): PersonaRepository {
  function filePath(userId: string): string {
    return join(usersRoot, userId, PERSONA_FILE);
  }

  return {
    async read(userId) {
      let content: string;
      try {
        content = await readFile(filePath(userId), "utf8");
      } catch (error) {
        if (!isFileMissing(error)) {
          personaLogger.error(error, "Failed to load persona");
        }
        return { rows: [] };
      }
      return parsePersona(content);
    },

    async write(userId, persona) {
      const serialized = serializePersona(persona);
      await writeFileAtomic(filePath(userId), serialized);
    },
  };
}

function parsePersona(content: string): Persona {
  if (!content.trimStart().startsWith("---\n")) {
    return { rows: [] };
  }
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { rows: [] };
  }
  const [, frontmatterText, bodyText] = match;
  let frontmatter: unknown;
  try {
    frontmatter = parseYaml(frontmatterText, { schema: "core" });
  } catch (error) {
    personaLogger.error({ error }, "Failed to parse persona frontmatter");
    return { rows: [] };
  }
  if (!isPersonaFrontmatter(frontmatter)) {
    return { rows: [] };
  }
  const bodyLines = bodyText.split("\n").filter((line) => line.trim().length > 0);
  if (bodyLines.length !== frontmatter.rows.length) {
    return { rows: [] };
  }
  const rows: PersonaRow[] = [];
  for (let i = 0; i < frontmatter.rows.length; i++) {
    const meta = frontmatter.rows[i];
    const parsed = parseBodyLine(bodyLines[i]);
    if (!parsed || parsed.category !== meta.category) {
      return { rows: [] };
    }
    rows.push({
      id: meta.id,
      category: meta.category,
      fact: parsed.fact,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    });
  }
  return { rows };
}

function isPersonaFrontmatter(value: unknown): value is {
  rows: Array<{ id: string; category: PersonaCategory; createdAt: string; updatedAt: string }>;
} {
  if (typeof value !== "object" || value === null || !("rows" in value)) {
    return false;
  }
  const rows = (value as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) {
    return false;
  }
  for (const row of rows) {
    if (
      typeof row !== "object" ||
      row === null ||
      typeof (row as { id?: unknown }).id !== "string" ||
      !isPersonaCategory((row as { category?: unknown }).category) ||
      typeof (row as { createdAt?: unknown }).createdAt !== "string" ||
      typeof (row as { updatedAt?: unknown }).updatedAt !== "string"
    ) {
      return false;
    }
  }
  return true;
}

function isPersonaCategory(value: unknown): value is PersonaCategory {
  return value === "role" || value === "topic" || value === "tools";
}

function parseBodyLine(line: string): { category: PersonaCategory; fact: string } | null {
  const match = line.match(/^(role|topic|tools): (.*)$/);
  if (!match) {
    return null;
  }
  const [, category, fact] = match;
  return { category: category as PersonaCategory, fact };
}

function serializePersona(persona: Persona): string {
  const error = validatePersona(persona);
  if (error !== null) {
    throw new Error(error);
  }
  const frontmatter = {
    rows: persona.rows.map(({ id, category, createdAt, updatedAt }) => ({
      id,
      category,
      createdAt,
      updatedAt,
    })),
  };
  return `---\n${stringifyYaml(frontmatter).trim()}\n---\n${serializePersonaRows(persona.rows)}\n`;
}

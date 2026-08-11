import { randomUUID } from "node:crypto";
import {
  MAX_PERSONA_ROW_CHARS,
  MAX_PERSONA_ROWS,
  MAX_PERSONA_TOTAL_CHARS,
  serializePersonaRows,
  validatePersona,
  type HistoryEntry,
  type Persona,
  type PersonaCategory,
  type PersonaRow,
} from "../../repositories/index.js";
import type { ChatMessage, ChatProvider } from "../llm/index.js";
import { getLogger } from "../../utils/logger.js";
import { daysSince } from "../../utils/dates.js";

const extractorLogger = getLogger("memory-extractor");

const MAX_PERSONA_ATTEMPTS = 3;

const ALLOWED_CATEGORIES: ReadonlySet<string> = new Set(["role", "topic", "tools"]);

const VOCABULARY_PROMPT = `# Task
You read pairs of speech-recognizer text (Input) and its polished version (Output). The Input has recognition mistakes: wrong words, missing words, repeated words.

Your job: list the special words the user says — product names, brand names, technology names, and technical terms.

# Filtering
For each candidate word, ask these 4 questions IN ORDER. If any answer is NO, drop the word.

1. Does the word appear in the Input/Output pairs? (Never list words from this prompt.)
2. Is it a product name, brand, technology, or technical term? (Everyday words: NO.)
3. Could a speech recognizer easily mishear it, or is its spelling non-obvious? (Words everyone knows and spells correctly, like "apple": NO.)
4. Are you 100% sure of its correct written form? (Any doubt: NO.)

# Rules
- Only list words that pass ALL 4 questions.
- Use the correct spelling from the Output, not the wrong spelling from the Input. If the Input says "cloud code" and the Output says "Claude Code", list "Claude Code".
- A term can be one word or several words.
- List at most 5 terms. If more pass, keep the 5 most important.

# Output Format
Output only JSON like this, nothing else:

{"vocabulary": ["Claude Code", "Codex"]}`;

export interface MemoryExtraction {
  vocabulary: string[];
  persona: Persona;
}

export async function extractMemory(
  entries: HistoryEntry[],
  currentPersona: Persona,
  provider: ChatProvider,
): Promise<MemoryExtraction> {
  const vocabulary = await extractVocabulary(entries, provider);
  const persona = await updatePersona(currentPersona, entries, provider);
  return { vocabulary, persona };
}

function formatPairs(entries: HistoryEntry[]): string {
  return entries.map((e) => `Input: ${e.input}\nOutput: ${e.output}`).join("\n\n");
}

async function extractVocabulary(
  entries: HistoryEntry[],
  provider: ChatProvider,
): Promise<string[]> {
  const result = await provider.chat([
    { content: VOCABULARY_PROMPT, role: "system" },
    { content: formatPairs(entries), role: "user" },
  ]);

  try {
    const parsed = JSON.parse(result.trim()) as { vocabulary?: unknown[] };
    return (parsed.vocabulary ?? []).filter((v): v is string => typeof v === "string");
  } catch (error) {
    extractorLogger.error(
      { error, rawResult: result.slice(0, 500) },
      "Failed to parse vocabulary extraction result",
    );
    return [];
  }
}

function buildPersonaPrompt(currentPersona: Persona, entries: HistoryEntry[]): string {
  const rows =
    currentPersona.rows
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map((row) => {
        const createdDays = daysSince(row.createdAt);
        const updatedDays = daysSince(row.updatedAt);
        return `- ${row.category}: ${row.fact} (created ${createdDays} days ago, updated ${updatedDays} days ago)`;
      })
      .join("\n") || "(none)";

  return `# Task
You maintain a concise user profile for a dictation app. The profile is a list of facts, one per line.

# Allowed categories
- role: job, role, or work domain.
- topic: topics the user cares about.
- tools: software, products, brands, or tech stack.

# Disallowed content
- Do not include quotes or examples from dictations.
- Do not include temporary events (e.g., "today discussed X").
- Do not include sensitive personal information (phone, address, real name).

# Current profile rows
Each row shows its age. Older rows have lower weight and should be merged or deleted if similar or obsolete.
${rows}

# Recent dictations
The user dictates into our app, but a dictation is not necessarily a self-description. The user may dictate anything: reading notes, blog drafts, product reviews, and more. Read them to learn new facts, but do not copy them.
${formatPairs(entries)}

# Confidence
Only add or change a row when the dictations reveal something likely about the user themselves, not about the content they dictated. Use the current profile rows as context to judge what fits the user. When in doubt, keep the profile unchanged — a wrong fact is worse than a missing one.

# Rules
1. Output a JSON array: [{ "id"?: string, "category": "role" | "topic" | "tools", "fact": string }].
2. Existing rows that are still correct keep their "id"; new rows omit "id".
3. Merge similar rows into one.
4. Delete rows that are no longer true or contradicted by the recent dictations.
5. Each fact must be at most ${MAX_PERSONA_ROW_CHARS} characters including the "category: " prefix.
6. At most ${MAX_PERSONA_ROWS} rows; total length at most ${MAX_PERSONA_TOTAL_CHARS} characters.
7. If you learn nothing new and nothing changed, return the current rows exactly.

# Output
Output only the JSON array.`;
}

async function updatePersona(
  currentPersona: Persona,
  entries: HistoryEntry[],
  provider: ChatProvider,
): Promise<Persona> {
  const messages: ChatMessage[] = [
    { content: buildPersonaPrompt(currentPersona, entries), role: "system" },
  ];
  for (let attempt = 0; attempt < MAX_PERSONA_ATTEMPTS; attempt++) {
    const result = (await provider.chat(messages)).trim();
    const parsed = parsePersonaResponse(result);
    if (parsed) {
      let merged = mergePersonaRows(currentPersona, parsed);
      if (validatePersona(merged) !== null) {
        merged = trimOldestRows(merged);
      }
      if (validatePersona(merged) === null) {
        return merged;
      }
      messages.push(
        { content: result, role: "assistant" },
        {
          content: `This profile violates the limits. Return a valid JSON array within ${MAX_PERSONA_ROWS} rows, ${MAX_PERSONA_ROW_CHARS} chars per row, and ${MAX_PERSONA_TOTAL_CHARS} chars total.`,
          role: "user",
        },
      );
      continue;
    }
    messages.push(
      { content: result, role: "assistant" },
      {
        content: `Your last output was not a valid JSON array with shape { id?: string, category: "role" | "topic" | "tools", fact: string }. Output only the JSON array.`,
        role: "user",
      },
    );
  }
  extractorLogger.warn("Persona update abandoned: LLM returned invalid response after retries");
  return currentPersona;
}

function parsePersonaResponse(
  result: string,
): Array<{ id?: string; category: string; fact: string }> | null {
  let json = result;
  if (json.startsWith("```")) {
    json = json.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const filtered = parsed.filter(
      (item): item is { id?: string; category: string; fact: string } => {
        if (typeof item !== "object" || item === null) {
          return false;
        }
        const { id, category, fact } = item as { id?: unknown; category?: unknown; fact?: unknown };
        return (
          typeof category === "string" &&
          typeof fact === "string" &&
          !fact.includes("\n") &&
          (id === undefined || typeof id === "string")
        );
      },
    );
    if (parsed.length > 0 && filtered.length === 0) {
      return null;
    }
    return filtered;
  } catch (error) {
    extractorLogger.error(
      { error, rawResult: result.slice(0, 500) },
      "Failed to parse persona extraction result",
    );
    return null;
  }
}

function normalizeCategory(value: string): PersonaCategory | null {
  return ALLOWED_CATEGORIES.has(value) ? (value as PersonaCategory) : null;
}

function mergePersonaRows(
  current: Persona,
  returned: Array<{ id?: string; category: string; fact: string }>,
): Persona {
  const oldById = new Map(current.rows.map((r) => [r.id, r]));
  const now = new Date().toISOString();
  const rows: PersonaRow[] = [];
  for (const item of returned) {
    const category = normalizeCategory(item.category);
    if (!category) {
      continue;
    }
    const fact = item.fact.trim();
    if (!fact) {
      continue;
    }
    const old = item.id ? oldById.get(item.id) : undefined;
    if (old && old.category === category && old.fact === fact) {
      rows.push(old);
      continue;
    }
    rows.push({ id: randomUUID(), category, fact, createdAt: now, updatedAt: now });
  }
  return { rows };
}

function trimOldestRows(persona: Persona): Persona {
  const byAge = persona.rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => Date.parse(a.row.updatedAt) - Date.parse(b.row.updatedAt));
  let kept = byAge;
  while (kept.length > MAX_PERSONA_ROWS) {
    kept = kept.slice(1);
  }
  while (
    kept.length > 0 &&
    serializePersonaRows(kept.map((entry) => entry.row)).length > MAX_PERSONA_TOTAL_CHARS
  ) {
    kept = kept.slice(1);
  }
  const dropped = new Set(byAge.slice(0, byAge.length - kept.length).map((entry) => entry.index));
  return { rows: persona.rows.filter((_, index) => !dropped.has(index)) };
}

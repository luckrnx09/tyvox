import type { Persona, PersonaRow } from "./types.js";

export const MAX_PERSONA_ROWS = 10;
export const MAX_PERSONA_ROW_CHARS = 40;
export const MAX_PERSONA_TOTAL_CHARS = 400;

export function serializePersonaRows(rows: PersonaRow[]): string {
  return rows.map((row) => `${row.category}: ${row.fact}`).join("\n");
}

export function validatePersona(persona: Persona): string | null {
  if (persona.rows.length > MAX_PERSONA_ROWS) {
    return `Persona exceeds max rows: ${persona.rows.length} > ${MAX_PERSONA_ROWS}`;
  }
  const body = serializePersonaRows(persona.rows);
  if (body.length > MAX_PERSONA_TOTAL_CHARS) {
    return `Persona exceeds max total length: ${body.length} > ${MAX_PERSONA_TOTAL_CHARS}`;
  }
  for (const row of persona.rows) {
    if (row.fact.includes("\n")) {
      return "Persona row fact must be a single line";
    }
    const line = `${row.category}: ${row.fact}`;
    if (line.length > MAX_PERSONA_ROW_CHARS) {
      return `Persona row exceeds max length: ${line.length} > ${MAX_PERSONA_ROW_CHARS}`;
    }
  }
  return null;
}

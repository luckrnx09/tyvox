import type { Persona } from "../../../repositories/types.js";
import { daysSince } from "../../../utils/dates.js";

export function buildPersonaSection(persona: Persona): string {
  if (persona.rows.length === 0) {
    return "";
  }
  const lines = persona.rows
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((row) => {
      const days = daysSince(row.updatedAt);
      const suffix = days === 1 ? "day" : "days";
      return `${row.category}: ${row.fact} (updated ${days} ${suffix} ago)`;
    });
  return `## Persona\n${lines.join("\n")}`;
}

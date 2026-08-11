import type { RecentHistoryEntry } from "../../../repositories/index.js";
import { RECENT_HISTORY_WINDOW_MS } from "../../../repositories/recent-history.js";

const MAX_RECORDS = 5;
const MIN_OUTPUT_CHARS = 10;
const TRUNCATE_CHARS = 50;

export function buildRecentHistorySection(
  entries: RecentHistoryEntry[],
  now: number = Date.now(),
): string {
  const cutoff = now - RECENT_HISTORY_WINDOW_MS;
  const recent = entries
    .filter((entry) => Date.parse(entry.timestamp) >= cutoff)
    .map((entry) => ({ ...entry, output: entry.output.replace(/\s+/g, " ").trim() }))
    .filter((entry) => entry.output.length > MIN_OUTPUT_CHARS)
    .slice(-MAX_RECORDS);
  if (recent.length === 0) return "";

  const lines = recent.map(
    (entry) => `${formatTimestamp(new Date(entry.timestamp))} - ${truncate(entry.output)}`,
  );
  return [
    "## Recent History",
    "The user recently said the following. They may help you understand the current input, but they are not guaranteed to be related.",
    "",
    ...lines,
  ].join("\n");
}

function truncate(output: string): string {
  if (output.length <= TRUNCATE_CHARS) return output;
  const truncated = output.length - TRUNCATE_CHARS;
  return `${output.slice(0, TRUNCATE_CHARS)}… (${truncated} more chars truncated)`;
}

function formatTimestamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${String(date.getFullYear()).slice(-2)}${pad(date.getMonth() + 1)}${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

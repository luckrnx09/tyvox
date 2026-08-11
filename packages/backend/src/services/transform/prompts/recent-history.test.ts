import { describe, test, expect } from "vitest";
import { buildRecentHistorySection } from "./recent-history.js";
import { RECENT_HISTORY_WINDOW_MS } from "../../../repositories/recent-history.js";
import type { RecentHistoryEntry } from "../../../repositories/index.js";

const NOW = Date.parse("2026-07-18T14:00:00Z");

function entry(output: string, timestamp: string): RecentHistoryEntry {
  return { output, timestamp };
}

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString();
}

describe("buildRecentHistorySection", () => {
  test("returns empty string when there are no entries", () => {
    expect(buildRecentHistorySection([], NOW)).toBe("");
  });

  test("returns empty string when all entries are outside the window", () => {
    const entries = [entry("a record long enough", minutesAgo(31))];
    expect(buildRecentHistorySection(entries, NOW)).toBe("");
  });

  test("drops entries with output of 10 chars or less", () => {
    const entries = [entry("1234567890", minutesAgo(1))];
    expect(buildRecentHistorySection(entries, NOW)).toBe("");
  });

  test("keeps the latest 5 records within the window", () => {
    const entries = Array.from({ length: 7 }, (_, i) =>
      entry(`record number ${i} padded`, minutesAgo(10 - i)),
    );
    const section = buildRecentHistorySection(entries, NOW);
    expect(section).not.toContain("record number 0");
    expect(section).not.toContain("record number 1");
    expect(section).toContain("record number 2 padded");
    expect(section).toContain("record number 6 padded");
  });

  test("includes header and disclaimer", () => {
    const entries = [entry("a record long enough", minutesAgo(1))];
    const section = buildRecentHistorySection(entries, NOW);
    expect(section).toContain("## Recent History");
    expect(section).toContain("not guaranteed to be related");
  });

  test("formats timestamps as YYMMDD HH:MM:SS", () => {
    const entries = [entry("a record long enough", minutesAgo(1))];
    const section = buildRecentHistorySection(entries, NOW);
    expect(section).toMatch(/\d{6} \d{2}:\d{2}:\d{2} - a record long enough/);
  });

  test("truncates records over 50 chars and reports the cut", () => {
    const output = "x".repeat(100);
    const entries = [entry(output, minutesAgo(1))];
    const section = buildRecentHistorySection(entries, NOW);
    expect(section).toContain(`${"x".repeat(50)}… (50 more chars truncated)`);
    expect(section).not.toContain("x".repeat(51));
  });

  test("flattens multiline output into one line", () => {
    const entries = [entry("first line\nsecond line\nthird line", minutesAgo(1))];
    const section = buildRecentHistorySection(entries, NOW);
    expect(section).toContain("first line second line third line");
    expect(section).not.toContain("first line\nsecond line");
  });

  test("accepts entries at exactly the window edge", () => {
    const atEdge = new Date(NOW - RECENT_HISTORY_WINDOW_MS).toISOString();
    const entries = [entry("a record long enough", atEdge)];
    expect(buildRecentHistorySection(entries, NOW)).not.toBe("");
  });
});

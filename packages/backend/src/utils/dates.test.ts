import { test, expect } from "vitest";
import { daysSince, MS_PER_DAY } from "./dates.js";

test("returns 0 for the current time", () => {
  expect(daysSince(new Date().toISOString())).toBe(0);
});

test("returns whole days elapsed", () => {
  const fiveDaysAgo = new Date(Date.now() - 5 * MS_PER_DAY).toISOString();
  expect(daysSince(fiveDaysAgo)).toBe(5);
});

test("floors partial days", () => {
  const dayAndAHalfAgo = new Date(Date.now() - 1.5 * MS_PER_DAY).toISOString();
  expect(daysSince(dayAndAHalfAgo)).toBe(1);
});

test("clamps future timestamps to 0", () => {
  const tomorrow = new Date(Date.now() + MS_PER_DAY).toISOString();
  expect(daysSince(tomorrow)).toBe(0);
});

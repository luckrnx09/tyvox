import { beforeEach, describe, expect, it } from "vitest";
import { isUpdateSnoozed, snoozeUpdates } from "./update-snooze";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("update snooze", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("is not snoozed by default", () => {
    expect(isUpdateSnoozed()).toBe(false);
  });

  it("is snoozed right after snoozing", () => {
    snoozeUpdates(1000);
    expect(isUpdateSnoozed(1000)).toBe(true);
  });

  it("stays snoozed within five days", () => {
    snoozeUpdates(0);
    expect(isUpdateSnoozed(5 * DAY_MS - 1)).toBe(true);
  });

  it("expires after five days", () => {
    snoozeUpdates(0);
    expect(isUpdateSnoozed(5 * DAY_MS + 1)).toBe(false);
  });

  it("ignores malformed values", () => {
    localStorage.setItem("tyvox.updateSnoozedUntil", "garbage");
    expect(isUpdateSnoozed()).toBe(false);
  });
});

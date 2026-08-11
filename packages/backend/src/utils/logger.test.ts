import { describe, it, expect } from "vitest";
import { getLogger } from "./logger.js";

describe("getLogger", () => {
  it("returns a logger for a valid source", () => {
    expect(getLogger("desktop")).toBeDefined();
  });

  it("falls back to the unknown logger for sources with path separators", () => {
    const fallback = getLogger("unknown");
    expect(getLogger("../../../tmp/evil")).toBe(fallback);
    expect(getLogger("a/b")).toBe(fallback);
  });

  it("caps the number of distinct loggers", () => {
    const fallback = getLogger("unknown");
    for (let index = 0; index < 64; index++) {
      getLogger(`flood-${index}`);
    }
    expect(getLogger("one-more")).toBe(fallback);
  });
});

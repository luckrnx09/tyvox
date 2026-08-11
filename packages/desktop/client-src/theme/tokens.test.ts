import { describe, expect, it } from "vitest";
import { theme } from "./tokens";

describe("theme", () => {
  it("defines dark and light color schemes", () => {
    expect(theme.colorSchemes.dark.palette.background?.default).toBe("#08090A");
    expect(theme.colorSchemes.dark.palette.background?.paper).toBe("#101114");
    expect(theme.colorSchemes.light.palette.background?.default).toBe("#FAFAFA");
    expect(theme.colorSchemes.light.palette.background?.paper).toBe("#FFFFFF");
  });

  it("keeps brand primary in dark mode and deepens it in light mode", () => {
    expect(theme.colorSchemes.dark.palette.primary?.main).toBe("#6C5CE7");
    expect(theme.colorSchemes.light.palette.primary?.main).toBe("#5A4BD1");
  });
});

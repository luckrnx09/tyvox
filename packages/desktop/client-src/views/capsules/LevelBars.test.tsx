import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LevelBars } from "./LevelBars";

describe("LevelBars", () => {
  it("renders the requested number of bars", () => {
    const analyserRef = { current: null as AnalyserNode | null };
    const { container } = render(<LevelBars barCount={5} analyserRef={analyserRef} />);
    expect(container.querySelectorAll('[data-testid="lb-bar"]').length).toBe(5);
    expect(container.querySelectorAll('[data-testid="lb-strip"]').length).toBe(5);
  });
});

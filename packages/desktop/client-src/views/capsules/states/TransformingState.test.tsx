import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { TransformingState } from "./TransformingState";
import i18n from "../../../i18n";

const renderState = (variant: "polish" | "translate", progress: number) =>
  render(
    <I18nextProvider i18n={i18n}>
      <TransformingState variant={variant} progress={progress} />
    </I18nextProvider>,
  );

describe("TransformingState", () => {
  it("renders the polish variant", () => {
    renderState("polish", 0);
    expect(screen.getByTestId("capsule-polishing")).toBeInTheDocument();
  });

  it("renders the translate variant", () => {
    renderState("translate", 0);
    expect(screen.getByTestId("capsule-translating")).toBeInTheDocument();
  });

  it("plays the sliding band while progress is 0", () => {
    renderState("polish", 0);
    expect(screen.getByTestId("backdrop-band")).toBeInTheDocument();
    expect(screen.queryByTestId("backdrop-fill")).not.toBeInTheDocument();
  });

  it("fills the background by progress once it advances", () => {
    renderState("translate", 0.42);
    const fill = screen.getByTestId("backdrop-fill");
    expect(fill).toHaveStyle({ width: "42%" });
    expect(screen.queryByTestId("backdrop-band")).not.toBeInTheDocument();
  });

  it("fills the background completely at full progress", () => {
    renderState("polish", 1);
    expect(screen.getByTestId("backdrop-fill")).toHaveStyle({ width: "100%" });
  });
});

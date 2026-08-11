import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { I18nextProvider } from "react-i18next";
import { ActionsTab } from "./ActionsTab";
import { theme } from "../../../theme/tokens";
import i18n from "../../../i18n";
import { useSettings } from "../../../hooks/useSettings";
import type { UserConfig } from "@tyvox/sdk/client";

vi.mock("../../../hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

const baseConfig = {
  version: 1,
  desktop: {
    hotkey: { mode: "toggle" as const },
    actions: {
      basic: { hotkey: { accelerator: "AltRight" } },
      translate: {
        hotkey: { accelerator: "Alt+Shift" },
        payload: { target: "English" },
      },
    },
    microphone: { deviceId: "default" },
    uiLocale: "en" as const,
  },
  llm: {
    provider: "openai" as const,
    apiKey: "key",
    baseUrl: "http://localhost:1234",
    model: "model",
    tone: "professional" as const,
  },
  speech: { provider: "whisper:small" as const, languages: [] },
} satisfies UserConfig;

const renderActionsTab = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <ActionsTab />
      </ThemeProvider>
    </I18nextProvider>,
  );

describe("ActionsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      config: baseConfig,
      isLoaded: true,
      load: vi.fn(),
      update: vi.fn(),
      reset: vi.fn(),
    });
    window.electron = {
      send: vi.fn(),
      invoke: vi.fn(),
      on: vi.fn(() => vi.fn()),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
    } as unknown as typeof window.electron;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts recording when the hotkey box is clicked", async () => {
    renderActionsTab();
    const boxes = screen.getAllByRole("button", { name: "Record New" });
    act(() => {
      fireEvent.click(boxes[0]);
    });
    expect(await screen.findByText("Press keys...")).toBeInTheDocument();
  });

  it("cancels recording with Escape", async () => {
    renderActionsTab();
    const boxes = screen.getAllByRole("button", { name: "Record New" });
    fireEvent.click(boxes[0]);
    await screen.findByText("Press keys...");
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    await waitFor(() => {
      expect(screen.queryByText("Press keys...")).not.toBeInTheDocument();
    });
  });

  it("records a modifier combo and notifies the main process", async () => {
    const update = vi.fn();
    (useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      config: baseConfig,
      isLoaded: true,
      load: vi.fn(),
      update,
      reset: vi.fn(),
    });
    renderActionsTab();
    const boxes = screen.getAllByRole("button", { name: "Record New" });
    fireEvent.click(boxes[0]);
    await screen.findByText("Press keys...");

    expect(window.electron.send).toHaveBeenCalledWith("settings:hotkey-recording", {
      recording: true,
    });

    act(() => {
      fireEvent.keyDown(window, { key: "Meta", code: "MetaLeft" });
      fireEvent.keyDown(window, { key: "x", code: "KeyX", metaKey: true });
    });

    expect(update).toHaveBeenCalledWith({
      desktop: {
        ...baseConfig.desktop,
        actions: {
          ...baseConfig.desktop.actions,
          basic: { hotkey: { accelerator: "CmdOrCtrl+X" } },
        },
      },
    });
    expect(window.electron.send).toHaveBeenCalledWith("settings:hotkey-recording", {
      recording: false,
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { I18nextProvider } from "react-i18next";
import { GeneralTab } from "./GeneralTab";
import { theme } from "../../../theme/tokens";
import i18n from "../../../i18n";
import { useSettings } from "../../../hooks/useSettings";
import { useLocalSettings } from "../../../hooks/useLocalSettings";
import {
  checkASRReadiness,
  checkLLMReadiness,
  healthCheck,
  setup,
  type UserConfig,
} from "@tyvox/sdk/client";
import { IPC } from "../../../../shared/channels";

vi.mock("../../../hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

vi.mock("../../../hooks/useLocalSettings", () => ({
  useLocalSettings: vi.fn(),
}));

vi.mock("@tyvox/sdk/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tyvox/sdk/client")>()),
  checkASRReadiness: vi.fn(),
  checkLLMReadiness: vi.fn(),
  healthCheck: vi.fn(),
  setup: vi.fn(),
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

const renderGeneralTab = (onNavigate = vi.fn()) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <GeneralTab onNavigate={onNavigate} />
      </ThemeProvider>
    </I18nextProvider>,
  );

describe("GeneralTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      config: baseConfig,
      isLoaded: true,
      load: vi.fn(),
      update: vi.fn(),
      reset: vi.fn(),
    });
    (useLocalSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      localSettings: { useLocalBackend: true, serverUrl: "http://localhost:23456" },
      isLoaded: true,
      updateLocalSettings: vi.fn(),
    });
    (checkASRReadiness as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ready: true },
    });
    (checkLLMReadiness as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ready: true },
    });
    (healthCheck as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    window.electron = {
      invoke: vi.fn((channel: string) => {
        if (channel === IPC.START_BACKEND) {
          return Promise.resolve("http://localhost:23456");
        }
        return Promise.resolve({ granted: true });
      }),
      on: vi.fn(() => vi.fn()),
      removeListener: vi.fn(),
    } as unknown as typeof window.electron;
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("shows all readiness cards", async () => {
    renderGeneralTab();
    await waitFor(() => {
      expect(screen.getByText("Microphone")).toBeInTheDocument();
      expect(screen.getByText("Accessibility")).toBeInTheDocument();
      expect(screen.getByText("Hotkeys")).toBeInTheDocument();
      expect(screen.getByText("Speech Recognition Model")).toBeInTheDocument();
      expect(screen.getByText("Language Model")).toBeInTheDocument();
    });
  });

  it("reports hotkey failure when no accelerator is configured", async () => {
    (useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      config: {
        ...baseConfig,
        desktop: {
          ...baseConfig.desktop,
          actions: {
            basic: { hotkey: { accelerator: "" } },
            translate: {
              hotkey: { accelerator: "" },
              payload: { target: "English" },
            },
          },
        },
      },
      isLoaded: true,
      load: vi.fn(),
      update: vi.fn(),
      reset: vi.fn(),
    });
    renderGeneralTab();
    await waitFor(() => {
      expect(screen.getByText("Hotkey not configured.")).toBeInTheDocument();
    });
  });

  it("navigates to the speech tab when ASR readiness fails", async () => {
    const onNavigate = vi.fn();
    (checkASRReadiness as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ready: false, error: "not ready" },
    });
    renderGeneralTab(onNavigate);
    const button = await screen.findByRole("button", { name: "Configure" });
    act(() => {
      fireEvent.click(button);
    });
    expect(onNavigate).toHaveBeenCalledWith("speech");
  });

  it("navigates to the language model tab when LLM readiness fails", async () => {
    const onNavigate = vi.fn();
    (checkLLMReadiness as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ready: false, error: "unreachable" },
    });
    renderGeneralTab(onNavigate);
    const button = await screen.findByRole("button", { name: "Configure" });
    act(() => {
      fireEvent.click(button);
    });
    expect(onNavigate).toHaveBeenCalledWith("languageModel");
  });

  it("configures SDK to remote URL when remote backend is unreachable", async () => {
    const remoteUrl = "http://192.168.1.10:23456";
    (useLocalSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      localSettings: { useLocalBackend: false, serverUrl: remoteUrl },
      isLoaded: true,
      updateLocalSettings: vi.fn(),
    });
    window.electron = {
      invoke: vi.fn((channel: string) => {
        if (channel === IPC.START_BACKEND) {
          return Promise.reject(new Error("unreachable"));
        }
        return Promise.resolve({ granted: true });
      }),
      on: vi.fn(() => vi.fn()),
      removeListener: vi.fn(),
    } as unknown as typeof window.electron;

    renderGeneralTab();
    await waitFor(() => {
      expect(screen.getByText("Backend server is not reachable.")).toBeInTheDocument();
    });
    expect(setup).toHaveBeenCalledWith(
      { baseUrl: remoteUrl, userId: "default" },
      { source: "desktop" },
    );
  });

  it("switches color scheme when theme toggle is clicked", async () => {
    renderGeneralTab();
    const lightButton = await screen.findByRole("button", { name: "Light" });
    act(() => {
      fireEvent.click(lightButton);
    });
    expect(window.localStorage.getItem("mui-mode")).toBe("light");
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-light");
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { I18nextProvider } from "react-i18next";
import { LanguageModelTab } from "./LanguageModelTab";
import { theme } from "../../../theme/tokens";
import i18n from "../../../i18n";
import { useSettings } from "../../../hooks/useSettings";
import type { LLMProviderInfo, UserConfig } from "@tyvox/sdk/contracts";

vi.mock("../../../hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

vi.mock("@tyvox/sdk/client", () => ({
  listLLMProviders: vi.fn(),
  checkLLMReadiness: vi.fn(),
}));

import { checkLLMReadiness, listLLMProviders } from "@tyvox/sdk/client";

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
    provider: "ollama" as const,
    apiKey: "secret",
    baseUrl: "http://localhost:11434",
    model: "qwen3:latest",
    tone: "professional" as const,
    thinkingEnabled: false,
  },
  speech: { provider: "whisper:small" as const, languages: [] },
} satisfies UserConfig;

const llm = baseConfig.llm;

const providers = [
  { id: "ollama", name: "Ollama", defaultBaseUrl: "http://localhost:11434" },
  { id: "deepseek", name: "DeepSeek", defaultBaseUrl: "https://api.deepseek.com/v1" },
  { id: "custom", name: "Custom (OpenAI-compatible)", defaultBaseUrl: "" },
] satisfies LLMProviderInfo[];

const mockSettings = (update: ReturnType<typeof vi.fn>) => {
  vi.mocked(useSettings).mockReturnValue({
    config: baseConfig,
    update,
  });
  vi.mocked(listLLMProviders).mockResolvedValue({
    data: [...providers],
    status: 200,
    headers: new Headers(),
  });
};

const renderLanguageModelTab = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <LanguageModelTab />
      </ThemeProvider>
    </I18nextProvider>,
  );

const createDeferred = <T,>() => {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("LanguageModelTab", () => {
  beforeEach(() => {
    vi.mocked(checkLLMReadiness).mockResolvedValue({
      data: { ready: true },
      status: 200,
      headers: new Headers(),
    });
  });

  it("loads providers from the backend and clears credentials on switch to custom", async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    mockSettings(update);

    renderLanguageModelTab();

    const providerSelect = await screen.findByRole("combobox", { name: "Provider" });
    await user.click(providerSelect);
    await user.click(await screen.findByRole("option", { name: "Custom (OpenAI-compatible)" }));

    expect(update).toHaveBeenCalledWith({
      llm: { ...llm, provider: "custom", baseUrl: "", apiKey: "", model: "" },
    });
  });

  it("applies the default baseUrl for built-in providers", async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    vi.mocked(useSettings).mockReturnValue({
      config: {
        ...baseConfig,
        llm: { ...llm, provider: "custom", baseUrl: "https://example.com/v1" },
      },
      update,
    });
    vi.mocked(listLLMProviders).mockResolvedValue({
      data: [...providers],
      status: 200,
      headers: new Headers(),
    });

    renderLanguageModelTab();

    const providerSelect = await screen.findByRole("combobox", { name: "Provider" });
    await user.click(providerSelect);
    await user.click(await screen.findByRole("option", { name: "Ollama" }));

    expect(update).toHaveBeenCalledWith({
      llm: {
        ...llm,
        provider: "ollama",
        baseUrl: "http://localhost:11434",
        apiKey: "",
        model: "",
      },
    });
  });

  it("renders the tone selector and updates config on change", async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    mockSettings(update);

    renderLanguageModelTab();

    expect(screen.getByRole("heading", { name: "Tone" })).toBeInTheDocument();
    expect(
      screen.getByText(/Could you please send me the report soon\?/, { collapseWhitespace: false }),
    ).toBeInTheDocument();

    const casualButton = screen.getByRole("button", { name: "Casual" });
    await user.click(casualButton);

    expect(update).toHaveBeenCalledWith({ llm: { ...llm, tone: "casual" } });
  });

  it("verifies the config on mount and shows the result", async () => {
    mockSettings(vi.fn());
    vi.mocked(checkLLMReadiness).mockResolvedValue({
      data: { ready: true },
      status: 200,
      headers: new Headers(),
    });

    renderLanguageModelTab();

    expect(await screen.findByText("Configuration verified")).toBeInTheDocument();
  });

  it("shows the backend error when verification fails", async () => {
    mockSettings(vi.fn());
    vi.mocked(checkLLMReadiness).mockResolvedValue({
      data: { ready: false, error: "Invalid API key" },
      status: 200,
      headers: new Headers(),
    });

    renderLanguageModelTab();

    expect(await screen.findByText("Invalid API key")).toBeInTheDocument();
  });

  it("re-verifies after the debounce when text fields change", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockSettings(vi.fn());
      vi.mocked(checkLLMReadiness).mockResolvedValue({
        data: { ready: true },
        status: 200,
        headers: new Headers(),
      });

      renderLanguageModelTab();
      await screen.findByText("Configuration verified");

      const modelField = screen.getByRole("textbox", { name: "Model" });
      await user.type(modelField, "x");
      act(() => vi.advanceTimersByTime(1100));

      expect(vi.mocked(checkLLMReadiness).mock.calls.length).toBeGreaterThanOrEqual(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("adopts only the last readiness result when validations overlap", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const update = vi.fn();
      mockSettings(update);

      type Response = Awaited<ReturnType<typeof checkLLMReadiness>>;
      const first = createDeferred<Response>();
      const second = createDeferred<Response>();
      let calls = 0;
      vi.mocked(checkLLMReadiness).mockImplementation(() => {
        calls += 1;
        return calls === 1 ? first.promise : second.promise;
      });

      const { rerender } = renderLanguageModelTab();

      vi.mocked(useSettings).mockReturnValue({
        config: { ...baseConfig, llm: { ...llm, model: "qwen3:latestx" } },
        update,
      });
      rerender(
        <I18nextProvider i18n={i18n}>
          <ThemeProvider theme={theme}>
            <LanguageModelTab />
          </ThemeProvider>
        </I18nextProvider>,
      );
      act(() => vi.advanceTimersByTime(1100));

      await act(async () => {
        second.resolve({ data: { ready: true }, status: 200, headers: new Headers() });
      });
      expect(await screen.findByText("Configuration verified")).toBeInTheDocument();

      await act(async () => {
        first.resolve({
          data: { ready: false, error: "stale error" },
          status: 200,
          headers: new Headers(),
        });
      });
      expect(screen.queryByText("stale error")).not.toBeInTheDocument();
      expect(screen.getByText("Configuration verified")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("toggles thinkingEnabled", async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    mockSettings(update);

    renderLanguageModelTab();

    const switchControl = await screen.findByLabelText("Thinking mode");
    await user.click(switchControl);

    expect(update).toHaveBeenCalledWith({ llm: { ...llm, thinkingEnabled: true } });
  });

  it("shows extraBody textarea only for custom provider", async () => {
    const update = vi.fn();
    mockSettings(update);
    vi.mocked(useSettings).mockReturnValue({
      config: { ...baseConfig, llm: { ...llm, provider: "custom" } },
      update,
    });

    const { rerender } = renderLanguageModelTab();

    expect(
      await screen.findByRole("textbox", { name: "Advanced: extra request body (JSON)" }),
    ).toBeInTheDocument();

    vi.mocked(useSettings).mockReturnValue({
      config: { ...baseConfig, llm: { ...llm, provider: "deepseek" } },
      update,
    });
    rerender(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <LanguageModelTab />
        </ThemeProvider>
      </I18nextProvider>,
    );

    expect(
      screen.queryByRole("textbox", { name: "Advanced: extra request body (JSON)" }),
    ).not.toBeInTheDocument();
  });

  it("formats valid JSON on blur and flags invalid JSON", async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    vi.mocked(useSettings).mockReturnValue({
      config: { ...baseConfig, llm: { ...llm, provider: "custom" } },
      update,
    });
    vi.mocked(listLLMProviders).mockResolvedValue({
      data: [...providers],
      status: 200,
      headers: new Headers(),
    });

    renderLanguageModelTab();

    const extraBodyField = await screen.findByRole("textbox", {
      name: "Advanced: extra request body (JSON)",
    });

    await user.click(extraBodyField);
    await user.paste('{"a":1}');
    await user.tab();

    expect(update).toHaveBeenCalledWith({
      llm: { ...llm, provider: "custom", extraBody: '{\n  "a": 1\n}' },
    });

    await user.clear(extraBodyField);
    await user.click(extraBodyField);
    await user.paste("{bad");
    await user.tab();

    expect(await screen.findByText("Invalid JSON — not saved.")).toBeInTheDocument();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("does not render the max tokens field", async () => {
    mockSettings(vi.fn());

    renderLanguageModelTab();

    expect(screen.queryByLabelText("Max output tokens")).not.toBeInTheDocument();
  });
});

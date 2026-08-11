import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { I18nextProvider } from "react-i18next";
import { SpeechTab } from "./SpeechTab";
import { theme } from "../../../theme/tokens";
import i18n from "../../../i18n";
import { useSettings } from "../../../hooks/useSettings";
import { useASRModels } from "../../../hooks/useASRModels";
import { checkASRReadiness } from "@tyvox/sdk/client";

vi.mock("../../../hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

vi.mock("../../../hooks/useASRModels", () => ({
  useASRModels: vi.fn(),
}));

vi.mock("@tyvox/sdk/client", () => ({ checkASRReadiness: vi.fn(), resolveSessionId: vi.fn() }));

const renderSpeechTab = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <SpeechTab />
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

describe("SpeechTab", () => {
  const mockModelsWithStatus = (status: string) => {
    (useASRModels as ReturnType<typeof vi.fn>).mockReturnValue({
      groups: [
        {
          id: "whisper",
          name: "Whisper",
          modelSelection: "fixed",
          models: [
            { id: "whisper:small", name: "small", status, progress: undefined, error: undefined },
          ],
        },
      ],
      isLoading: false,
      prepare: vi.fn(),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      config: {
        desktop: {
          microphone: { deviceId: "default" },
        },
        speech: { provider: "whisper:small", languages: [] },
      },
      isLoaded: true,
      load: vi.fn(),
      update: vi.fn(),
      reset: vi.fn(),
    });
    mockModelsWithStatus("not_ready");
    vi.mocked(checkASRReadiness).mockResolvedValue({
      data: { ready: true },
      status: 200,
      headers: new Headers(),
    });
    window.electron = {
      invoke: vi.fn().mockResolvedValue([]),
      on: vi.fn(() => vi.fn()),
      removeListener: vi.fn(),
    } as unknown as typeof window.electron;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("replaces the Prepare button with a spinner and shows progress after click", async () => {
    const prepare = vi.fn().mockImplementation(() => new Promise(() => {}));
    (useASRModels as ReturnType<typeof vi.fn>).mockReturnValue({
      groups: [
        {
          id: "whisper",
          name: "Whisper",
          modelSelection: "fixed",
          models: [
            {
              id: "whisper:small",
              name: "small",
              status: "not_ready",
              progress: undefined,
              error: undefined,
            },
          ],
        },
      ],
      isLoading: false,
      prepare,
    });

    renderSpeechTab();

    await act(async () => {
      await Promise.resolve();
    });

    const button = screen.getByRole("button", { name: /Prepare/i });
    expect(button).not.toBeDisabled();

    act(() => {
      fireEvent.click(button);
    });

    expect(screen.queryByRole("button", { name: /Prepare/i })).not.toBeInTheDocument();
    expect(prepare).toHaveBeenCalledWith("whisper:small");
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("shows determinate progress with percentage while preparing", async () => {
    const prepare = vi.fn().mockImplementation(() => new Promise(() => {}));
    (useASRModels as ReturnType<typeof vi.fn>).mockReturnValue({
      groups: [
        {
          id: "whisper",
          name: "Whisper",
          modelSelection: "fixed",
          models: [
            {
              id: "whisper:small",
              name: "small",
              status: "preparing",
              progress: 0.42,
              error: undefined,
            },
          ],
        },
      ],
      isLoading: false,
      prepare,
    });

    renderSpeechTab();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    const determinate = screen
      .getAllByRole("progressbar")
      .find((el) => el.getAttribute("aria-valuenow") === "42");
    expect(determinate).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("renders the language selector card", async () => {
    renderSpeechTab();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: "Input Languages" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select up to 3 languages you commonly dictate in. Leave empty for auto-detection.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Input Languages")).toBeInTheDocument();
  });

  it("appends newly selected languages in selection order", async () => {
    const update = vi.fn();
    (useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      config: {
        desktop: {
          microphone: { deviceId: "default" },
        },
        speech: { provider: "whisper:small", languages: ["Chinese (Simplified)"] },
      },
      isLoaded: true,
      load: vi.fn(),
      update,
      reset: vi.fn(),
    });

    renderSpeechTab();

    await act(async () => {
      await Promise.resolve();
    });

    const input = screen.getByLabelText("Input Languages");
    fireEvent.change(input, { target: { value: "English" } });
    const option = await screen.findByRole("option", { name: "English" });

    await act(async () => {
      fireEvent.click(option);
    });

    expect(update).toHaveBeenCalledWith({
      speech: { provider: "whisper:small", languages: ["Chinese (Simplified)", "English"] },
    });
  });

  it("verifies readiness when the selected model is ready", async () => {
    mockModelsWithStatus("ready");
    renderSpeechTab();
    expect(await screen.findByText("Configuration verified")).toBeInTheDocument();
    expect(checkASRReadiness).toHaveBeenCalled();
  });

  it("does not verify when the model is not ready", async () => {
    renderSpeechTab();
    await screen.findByRole("button", { name: /prepare/i });
    expect(checkASRReadiness).not.toHaveBeenCalled();
  });

  it("shows the backend error when verification fails", async () => {
    mockModelsWithStatus("ready");
    vi.mocked(checkASRReadiness).mockResolvedValue({
      data: { ready: false, error: "transcription failed" },
      status: 200,
      headers: new Headers(),
    });
    renderSpeechTab();
    expect(await screen.findByText("transcription failed")).toBeInTheDocument();
  });

  it("shows a generic failure message when verification throws", async () => {
    mockModelsWithStatus("ready");
    vi.mocked(checkASRReadiness).mockRejectedValue(new Error("network down"));
    renderSpeechTab();
    expect(await screen.findByText("Verification failed")).toBeInTheDocument();
  });

  it("adopts only the last readiness result when model changes", async () => {
    type Response = Awaited<ReturnType<typeof checkASRReadiness>>;
    const first = createDeferred<Response>();
    const second = createDeferred<Response>();
    let calls = 0;
    vi.mocked(checkASRReadiness).mockImplementation(() =>
      calls++ === 0 ? first.promise : second.promise,
    );

    (useASRModels as ReturnType<typeof vi.fn>).mockReturnValue({
      groups: [
        {
          id: "whisper",
          name: "Whisper",
          modelSelection: "fixed",
          models: [
            {
              id: "whisper:small",
              name: "small",
              status: "ready",
              progress: undefined,
              error: undefined,
            },
            {
              id: "whisper:medium",
              name: "medium",
              status: "ready",
              progress: undefined,
              error: undefined,
            },
          ],
        },
      ],
      isLoading: false,
      prepare: vi.fn(),
    });
    (useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      config: {
        desktop: { microphone: { deviceId: "default" } },
        speech: { provider: "whisper:small", languages: [] },
      },
      isLoaded: true,
      load: vi.fn(),
      update: vi.fn(),
      reset: vi.fn(),
    });

    const { rerender } = renderSpeechTab();

    (useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      config: {
        desktop: { microphone: { deviceId: "default" } },
        speech: { provider: "whisper:medium", languages: [] },
      },
      isLoaded: true,
      load: vi.fn(),
      update: vi.fn(),
      reset: vi.fn(),
    });
    await act(async () => {
      rerender(
        <I18nextProvider i18n={i18n}>
          <ThemeProvider theme={theme}>
            <SpeechTab />
          </ThemeProvider>
        </I18nextProvider>,
      );
    });

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
  });
});

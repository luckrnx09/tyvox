import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { I18nextProvider } from "react-i18next";
import { theme } from "../../theme/tokens";
import i18n from "../../i18n";
import { IPC } from "../../../shared/channels";
import { Capsule } from "./index";

const ipcListeners: Record<string, (p: unknown) => void> = {};

vi.mock("../../hooks/useIpcListener", () => ({
  useIpcListener: (channel: string, cb: (p: unknown) => void) => {
    ipcListeners[channel] = cb;
  },
}));

const audioCaptureHandleChunk = vi.hoisted<{ current: ((pcm: ArrayBuffer) => void) | null }>(
  () => ({
    current: null,
  }),
);

vi.mock("../../hooks/useAudioCapture", () => ({
  useAudioCapture: vi.fn((handleChunk: (pcm: ArrayBuffer) => void) => {
    audioCaptureHandleChunk.current = handleChunk;
    return {
      analyserRef: { current: null },
      startCapture: vi.fn(),
      stopCapture: vi.fn(),
    };
  }),
  warmupAudioCapture: () => Promise.resolve(),
}));

vi.mock("../../hooks/useSound", () => ({
  useSound: vi.fn(() => vi.fn()),
}));

vi.mock("../../hooks/useSettings", () => ({
  useSettings: vi.fn(() => ({
    config: null,
    isLoaded: false,
    load: vi.fn(),
    update: vi.fn(),
    reset: vi.fn(),
  })),
}));

const transcribeMocks = vi.hoisted(() => ({
  startSession: vi.fn(),
  sendChunk: vi.fn(),
  finalize: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("../../hooks/useTranscribe", () => ({
  useTranscribe: vi.fn(() => transcribeMocks),
}));

const transformMocks = vi.hoisted(() => ({
  transform: vi.fn(),
}));

vi.mock("../../hooks/useTransform", () => ({
  useTransform: vi.fn(() => ({
    transform: transformMocks.transform,
    cancel: vi.fn(),
  })),
}));

const renderCapsule = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <Capsule />
      </ThemeProvider>
    </I18nextProvider>,
  );

const getAudioHandleChunk = () => {
  expect(audioCaptureHandleChunk.current).not.toBeNull();
  return audioCaptureHandleChunk.current as (pcm: ArrayBuffer) => void;
};

const RETRY_DELAY_MS = 2000;

const getTranscribeMocks = () => transcribeMocks;

describe("Capsule", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.electron = {
      invoke: vi.fn().mockResolvedValue({}),
      on: vi.fn(() => vi.fn()),
      removeListener: vi.fn(),
    } as unknown as typeof window.electron;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing visible in idle state", async () => {
    renderCapsule();
    expect(screen.queryByTestId("capsule-recording")).not.toBeInTheDocument();
  });

  it("renders transcribing state", async () => {
    renderCapsule();
    const stateChange = ipcListeners["capsule:state-change"];
    act(() => {
      if (stateChange) stateChange({ state: "transcribing" });
    });
    expect(await screen.findByTestId("capsule-transcribing")).toBeInTheDocument();
  });

  it("renders polishing state", async () => {
    renderCapsule();
    const stateChange = ipcListeners["capsule:state-change"];
    act(() => {
      if (stateChange) stateChange({ state: "polishing" });
    });
    expect(await screen.findByTestId("capsule-polishing")).toBeInTheDocument();
  });

  it("renders fallback state", async () => {
    renderCapsule();
    const stateChange = ipcListeners["capsule:state-change"];
    act(() => {
      if (stateChange) stateChange({ state: "fallback" });
    });
    expect(await screen.findByTestId("capsule-fallback")).toBeInTheDocument();
    expect(screen.getByText("Polish failed — original text inserted")).toBeInTheDocument();
  });

  it("starts recording from fallback state on hotkey:start-recording", async () => {
    renderCapsule();
    const stateChange = ipcListeners["capsule:state-change"];
    act(() => {
      if (stateChange) stateChange({ state: "fallback" });
    });
    expect(await screen.findByTestId("capsule-fallback")).toBeInTheDocument();

    act(() => {
      ipcListeners["hotkey:start-recording"]?.({ sessionId: "session-fb", action: null });
    });
    expect(await screen.findByTestId("capsule-recording")).toBeInTheDocument();
  });

  it("renders error message when error set", async () => {
    renderCapsule();
    const stateChange = ipcListeners["capsule:state-change"];
    act(() => {
      if (stateChange) {
        stateChange({
          state: "error",
          error: { code: "ASR_FAILED", message: "Transcription failed", recoverable: true },
        });
      }
    });
    expect(await screen.findByTestId("capsule-error")).toBeInTheDocument();
    expect(screen.getByText("Transcription failed")).toBeInTheDocument();
  });

  it("resets to idle when cancel arrives during an active state", async () => {
    renderCapsule();
    const stateChange = ipcListeners["capsule:state-change"];
    act(() => {
      if (stateChange) stateChange({ state: "transcribing" });
    });
    expect(await screen.findByTestId("capsule-transcribing")).toBeInTheDocument();
    act(() => {
      ipcListeners["capsule:cancel"]?.(undefined);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("capsule-transcribing")).not.toBeInTheDocument();
    });
  });

  it("ignores cancel in idle state", async () => {
    renderCapsule();
    act(() => {
      ipcListeners["capsule:cancel"]?.(undefined);
    });
    expect(screen.queryByTestId("capsule-recording")).not.toBeInTheDocument();
  });

  describe("AudioChunkBatcher integration", () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("flushes buffered chunks before finalize when recording stops", async () => {
      const { sendChunk, finalize } = getTranscribeMocks();
      finalize.mockResolvedValue({ durationMs: 100, text: "hello" });
      renderCapsule();

      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      act(() => {
        ipcListeners["hotkey:start-recording"]?.({ sessionId: "session-1", action: null });
      });
      const handleChunk = getAudioHandleChunk();
      now = 1000;
      act(() => {
        handleChunk(new ArrayBuffer(10));
        handleChunk(new ArrayBuffer(20));
      });
      act(() => {
        ipcListeners["hotkey:stop-recording"]?.(undefined);
      });

      await waitFor(() => expect(finalize).toHaveBeenCalled());
      expect(sendChunk).toHaveBeenCalledOnce();
      expect(sendChunk.mock.calls[0]![0].byteLength).toBe(30);
      expect(sendChunk.mock.invocationCallOrder[0]).toBeLessThan(
        finalize.mock.invocationCallOrder[0],
      );
    });

    it("batches audio chunks and flushes when maxDelayMs elapses", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { sendChunk } = getTranscribeMocks();
      renderCapsule();

      act(() => {
        ipcListeners["hotkey:start-recording"]?.({ sessionId: "session-1", action: null });
      });
      const handleChunk = getAudioHandleChunk();
      act(() => {
        handleChunk(new ArrayBuffer(10));
        handleChunk(new ArrayBuffer(20));
      });
      expect(sendChunk).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
      });

      expect(sendChunk).toHaveBeenCalledOnce();
      expect(sendChunk.mock.calls[0]![0].byteLength).toBe(30);
    });

    it("does not send old session chunks after too-short recording", async () => {
      const { sendChunk, finalize } = getTranscribeMocks();
      finalize.mockResolvedValue({ durationMs: 100, text: "hello" });
      renderCapsule();

      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      act(() => {
        ipcListeners["hotkey:start-recording"]?.({ sessionId: "session-1", action: null });
      });
      const handleChunk = getAudioHandleChunk();
      act(() => {
        handleChunk(new ArrayBuffer(10));
      });
      now = 100;
      act(() => {
        ipcListeners["hotkey:stop-recording"]?.(undefined);
      });

      now = 2000;
      act(() => {
        ipcListeners["hotkey:start-recording"]?.({ sessionId: "session-2", action: null });
      });
      const handleChunk2 = getAudioHandleChunk();
      now = 3000;
      act(() => {
        handleChunk2(new ArrayBuffer(20));
      });
      act(() => {
        ipcListeners["hotkey:stop-recording"]?.(undefined);
      });

      await waitFor(() => expect(finalize).toHaveBeenCalled());
      expect(sendChunk).toHaveBeenCalledOnce();
      expect(sendChunk.mock.calls[0]![0].byteLength).toBe(20);
    });

    it("increases timeoutScale on transform retries", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { finalize } = getTranscribeMocks();
      finalize.mockResolvedValue({ durationMs: 100, text: "hello" });
      transformMocks.transform
        .mockRejectedValueOnce(new Error("LLM request timed out"))
        .mockResolvedValueOnce("hello world");
      renderCapsule();

      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      act(() => {
        ipcListeners["hotkey:start-recording"]?.({ sessionId: "session-1", action: "basic" });
      });
      const handleChunk = getAudioHandleChunk();
      now = 1000;
      act(() => {
        handleChunk(new ArrayBuffer(10));
      });
      act(() => {
        ipcListeners["hotkey:stop-recording"]?.(undefined);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(transformMocks.transform).toHaveBeenCalledTimes(1);
      expect(transformMocks.transform.mock.calls[0]![2]).toBe(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
      });
      expect(transformMocks.transform).toHaveBeenCalledTimes(2);
      expect(transformMocks.transform.mock.calls[1]![2]).toBe(2);
    });

    it("injects the raw transcript after the final retry fails", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { finalize } = getTranscribeMocks();
      finalize.mockResolvedValue({ durationMs: 100, text: "原始转写" });
      transformMocks.transform.mockRejectedValue(new Error("LLM request timed out"));
      renderCapsule();

      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      act(() => {
        ipcListeners["hotkey:start-recording"]?.({ sessionId: "s1", action: "basic" });
      });
      now = 1000;
      act(() => {
        getAudioHandleChunk()(new ArrayBuffer(10));
      });
      act(() => {
        ipcListeners["hotkey:stop-recording"]?.(undefined);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(transformMocks.transform).toHaveBeenCalledTimes(1);
      expect(transformMocks.transform.mock.calls[0]![2]).toBe(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
      });
      expect(transformMocks.transform).toHaveBeenCalledTimes(2);
      expect(transformMocks.transform.mock.calls[1]![2]).toBe(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 100);
      });
      expect(window.electron.invoke).toHaveBeenCalledWith(IPC.INJECT_TEXT, { text: "原始转写" });
    });

    it("injects the raw transcript when transform returns empty", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { finalize } = getTranscribeMocks();
      finalize.mockResolvedValue({ durationMs: 100, text: "原始转写" });
      transformMocks.transform.mockResolvedValue("");
      renderCapsule();

      let now = 0;
      vi.spyOn(performance, "now").mockImplementation(() => now);

      act(() => {
        ipcListeners["hotkey:start-recording"]?.({ sessionId: "s1", action: "basic" });
      });
      now = 1000;
      act(() => {
        getAudioHandleChunk()(new ArrayBuffer(10));
      });
      act(() => {
        ipcListeners["hotkey:stop-recording"]?.(undefined);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 100);
      });

      expect(transformMocks.transform).toHaveBeenCalledTimes(2);
      expect(window.electron.invoke).toHaveBeenCalledWith(IPC.INJECT_TEXT, { text: "原始转写" });
    });
  });
});

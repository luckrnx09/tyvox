import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAudioCapture, warmupAudioCapture } from "./useAudioCapture";

class FakeAnalyser {
  frequencyBinCount = 64;
  smoothingTimeConstant = 0;
  disconnect() {}
  getByteFrequencyData(dest: Uint8Array) {
    dest.fill(0);
  }
}

class FakeStreamSource {
  connect() {}
  disconnect() {}
}

class FakeScriptProcessor {
  onaudioprocess:
    | ((e: { inputBuffer: { getChannelData: (n: number) => Float32Array } }) => void)
    | null = null;
  connect() {}
  disconnect() {}
}

let lastProcessor: FakeScriptProcessor | null = null;

class FakeAudioContext {
  destination = {};
  createAnalyser() {
    return new FakeAnalyser();
  }
  createScriptProcessor() {
    lastProcessor = new FakeScriptProcessor();
    return lastProcessor;
  }
  createMediaStreamSource() {
    return new FakeStreamSource();
  }
  close() {
    return Promise.resolve();
  }
  resume() {
    return Promise.resolve();
  }
}

describe("useAudioCapture", () => {
  beforeEach(() => {
    vi.stubGlobal("AudioContext", FakeAudioContext);

    if (!("mediaDevices" in navigator) || !navigator.mediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia: vi.fn() },
        writable: true,
      });
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    lastProcessor = null;
  });

  it("initially has a null analyserRef", () => {
    const { result } = renderHook(() => useAudioCapture(() => {}));
    expect(result.current.analyserRef.current).toBeNull();
    expect(result.current.isCapturing).toBe(false);
  });

  it("populates analyserRef after startCapture resolves and nulls it after stopCapture", async () => {
    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };
    vi.spyOn(navigator.mediaDevices, "getUserMedia").mockResolvedValue(
      fakeStream as unknown as MediaStream,
    );

    const { result } = renderHook(() => useAudioCapture(() => {}));
    await act(async () => {
      await result.current.startCapture();
    });
    expect(result.current.analyserRef.current).toBeInstanceOf(FakeAnalyser);
    expect(result.current.isCapturing).toBe(true);

    act(() => {
      result.current.stopCapture();
    });
    expect(result.current.analyserRef.current).toBeNull();
    expect(result.current.isCapturing).toBe(false);
  });

  it("does not expose a level value (FFT is read imperatively by LevelBars)", () => {
    const { result } = renderHook(() => useAudioCapture(() => {}));
    expect((result.current as unknown as { level?: number }).level).toBeUndefined();
  });

  it("delivers PCM chunks to onChunk callback as ArrayBuffer", async () => {
    let capturedBuffer: ArrayBuffer | undefined;
    const onChunk = vi.fn<(buffer: ArrayBuffer) => void>((buffer) => {
      capturedBuffer = buffer;
    });
    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };
    vi.spyOn(navigator.mediaDevices, "getUserMedia").mockResolvedValue(
      fakeStream as unknown as MediaStream,
    );

    const { result } = renderHook(() => useAudioCapture(onChunk, () => {}));
    await act(async () => {
      await result.current.startCapture();
    });

    const inputData = new Float32Array(4096);
    inputData[0] = 0.5;
    const event = { inputBuffer: { getChannelData: () => inputData } };

    lastProcessor!.onaudioprocess!(event);

    expect(onChunk).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(capturedBuffer).toBeDefined();
    expect(capturedBuffer!.byteLength).toBe(4096 * 2);
  });

  it("warmup creates and closes an AudioContext", async () => {
    const closeSpy = vi.spyOn(FakeAudioContext.prototype, "close").mockResolvedValue(undefined);
    await warmupAudioCapture();
    expect(closeSpy).toHaveBeenCalled();
  });

  it("uses the latest deviceId after the selected device changes", async () => {
    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi
      .spyOn(navigator.mediaDevices, "getUserMedia")
      .mockResolvedValue(fakeStream as unknown as MediaStream);

    const { result, rerender } = renderHook(
      ({ deviceId }) => useAudioCapture(() => {}, undefined, deviceId),
      { initialProps: { deviceId: "default" } },
    );
    rerender({ deviceId: "mic-1" });

    await act(async () => {
      await result.current.startCapture();
    });

    const constraints = getUserMedia.mock.calls[0]![0] as {
      audio: MediaTrackConstraints;
    };
    expect(constraints.audio.deviceId).toEqual({ exact: "mic-1" });
  });

  it("falls back to the default device when the selected device is unavailable", async () => {
    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi
      .spyOn(navigator.mediaDevices, "getUserMedia")
      .mockRejectedValueOnce(new DOMException("device gone", "NotFoundError"))
      .mockResolvedValueOnce(fakeStream as unknown as MediaStream);
    const onDeviceFallback = vi.fn();

    const { result } = renderHook(() =>
      useAudioCapture(() => {}, undefined, "gone-mic", onDeviceFallback),
    );
    await act(async () => {
      await result.current.startCapture();
    });

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    const retryConstraints = getUserMedia.mock.calls[1]![0] as {
      audio: MediaTrackConstraints;
    };
    expect(retryConstraints.audio.deviceId).toBeUndefined();
    expect(onDeviceFallback).toHaveBeenCalledOnce();
    expect(result.current.isCapturing).toBe(true);
  });

  it("does not fall back when microphone permission is denied", async () => {
    const getUserMedia = vi.spyOn(navigator.mediaDevices, "getUserMedia");
    getUserMedia.mockReset();
    getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const onError = vi.fn();
    const onDeviceFallback = vi.fn();

    const { result } = renderHook(() =>
      useAudioCapture(() => {}, onError, "mic-1", onDeviceFallback),
    );
    await act(async () => {
      await result.current.startCapture();
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(onDeviceFallback).not.toHaveBeenCalled();
    expect(result.current.isCapturing).toBe(false);
  });
});

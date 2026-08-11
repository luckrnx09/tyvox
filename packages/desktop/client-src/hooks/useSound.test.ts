import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSound } from "./useSound";

describe("useSound", () => {
  let audioInstance: { currentTime: number; play: ReturnType<typeof vi.fn> };
  let AudioCtor: ReturnType<typeof vi.fn>;

  function MockAudio() {
    AudioCtor(...arguments);
    return audioInstance;
  }

  beforeEach(() => {
    audioInstance = {
      currentTime: 99,
      play: vi.fn(() => Promise.resolve()),
    };
    AudioCtor = vi.fn();
    vi.stubGlobal("Audio", MockAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns a play function", () => {
    const { result } = renderHook(() => useSound("start"));
    expect(typeof result.current).toBe("function");
  });

  it("play() resets and plays the Audio element", () => {
    const { result } = renderHook(() => useSound("start"));

    act(() => result.current());

    expect(AudioCtor).toHaveBeenCalledTimes(1);
    expect(AudioCtor).toHaveBeenCalledWith("sounds/start.mp3");
    expect(audioInstance.currentTime).toBe(0);
    expect(audioInstance.play).toHaveBeenCalledTimes(1);
  });

  it("reuses the same Audio element on subsequent plays", () => {
    const { result } = renderHook(() => useSound("start"));

    act(() => result.current());
    act(() => result.current());

    expect(AudioCtor).toHaveBeenCalledTimes(1);
    expect(audioInstance.play).toHaveBeenCalledTimes(2);
  });

  it("handles missing audio file gracefully (play rejection swallowed)", async () => {
    audioInstance.play.mockRejectedValueOnce(new Error("not found"));
    const { result } = renderHook(() => useSound("error"));

    expect(() => act(() => result.current())).not.toThrow();
  });
});

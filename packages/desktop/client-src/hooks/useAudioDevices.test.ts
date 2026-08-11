import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAudioDevices } from "./useAudioDevices";

const mic = (deviceId: string, label: string, groupId = deviceId): MediaDeviceInfo =>
  ({ deviceId, kind: "audioinput", label, groupId }) as MediaDeviceInfo;

describe("useAudioDevices", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps audioinput devices to AudioDevice entries", async () => {
    const enumerateDevices = vi
      .fn()
      .mockResolvedValue([
        mic("default", "Default - Built-in Microphone", "builtin"),
        mic("usb-mic", "USB Microphone", "usb"),
        { deviceId: "cam", kind: "videoinput", label: "Camera" },
      ]);
    vi.stubGlobal("navigator", { mediaDevices: { enumerateDevices } });

    const { result } = renderHook(() => useAudioDevices());

    await act(async () => {});
    expect(result.current).toEqual([
      { id: "default", isDefault: true, name: "Built-in Microphone" },
      { id: "usb-mic", isDefault: false, name: "USB Microphone" },
    ]);
  });

  it("hides the real device shadowed by the default alias", async () => {
    const enumerateDevices = vi
      .fn()
      .mockResolvedValue([
        mic("default", "Default - AirPods", "airpods"),
        mic("airpods-real", "AirPods", "airpods"),
        mic("usb-mic", "USB Microphone", "usb"),
      ]);
    vi.stubGlobal("navigator", { mediaDevices: { enumerateDevices } });

    const { result } = renderHook(() => useAudioDevices());

    await act(async () => {});
    expect(result.current).toEqual([
      { id: "default", isDefault: true, name: "AirPods" },
      { id: "usb-mic", isDefault: false, name: "USB Microphone" },
    ]);
  });

  it("falls back to a positional name when the label is empty", async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([mic("mic-1", ""), mic("mic-2", "")]);
    vi.stubGlobal("navigator", { mediaDevices: { enumerateDevices } });

    const { result } = renderHook(() => useAudioDevices());

    await act(async () => {});
    expect(result.current).toEqual([
      { id: "mic-1", isDefault: false, name: "Microphone 1" },
      { id: "mic-2", isDefault: false, name: "Microphone 2" },
    ]);
  });

  it("refreshes when a devicechange event fires", async () => {
    let listener: (() => void) | null = null;
    const enumerateDevices = vi
      .fn()
      .mockResolvedValueOnce([mic("mic-1", "Mic One")])
      .mockResolvedValueOnce([mic("mic-1", "Mic One"), mic("mic-2", "Mic Two")]);
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices,
        addEventListener: (_event: string, cb: () => void) => {
          listener = cb;
        },
        removeEventListener: () => {},
      },
    });

    const { result } = renderHook(() => useAudioDevices());
    await act(async () => {});
    expect(result.current).toHaveLength(1);

    await act(async () => {
      listener!();
    });
    expect(result.current).toHaveLength(2);
  });

  it("stays empty when mediaDevices is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const { result } = renderHook(() => useAudioDevices());
    await act(async () => {});
    expect(result.current).toEqual([]);
  });
});

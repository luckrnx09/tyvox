import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIpcListener } from "./useIpcListener";

type Listener = (...args: unknown[]) => void;

describe("useIpcListener", () => {
  let onMock: ReturnType<typeof vi.fn>;
  let unsubscribe: ReturnType<typeof vi.fn>;
  let registered: Listener | null;

  beforeEach(() => {
    registered = null;
    unsubscribe = vi.fn();
    onMock = vi.fn((_channel: string, cb: Listener) => {
      registered = cb;
      return unsubscribe;
    });
    window.electron = {
      invoke: vi.fn(),
      on: onMock,
      removeListener: vi.fn(),
    } as unknown as typeof window.electron;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers listener on mount", () => {
    const callback = vi.fn();
    renderHook(() => useIpcListener("capsule:state-change", callback));

    expect(onMock).toHaveBeenCalledTimes(1);
    expect(onMock).toHaveBeenCalledWith("capsule:state-change", expect.any(Function));
  });

  it("calls callback when main process sends event", () => {
    const callback = vi.fn();
    renderHook(() => useIpcListener("capsule:state-change", callback));

    expect(registered).not.toBeNull();
    registered!("payload", 42, { extra: true });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("payload", 42, { extra: true });
  });

  it("unsubscribes on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useIpcListener("capsule:state-change", callback));

    expect(unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("resubscribes when channel changes", () => {
    const callback = vi.fn();
    const { rerender } = renderHook(({ channel }) => useIpcListener(channel, callback), {
      initialProps: { channel: "capsule:state-change" },
    });

    expect(onMock).toHaveBeenLastCalledWith("capsule:state-change", expect.any(Function));
    const firstUnsubscribe = onMock.mock.results[0]?.value as ReturnType<typeof vi.fn>;
    expect(firstUnsubscribe).not.toHaveBeenCalled();

    rerender({ channel: "capsule:text-update" });
    expect(onMock).toHaveBeenLastCalledWith("capsule:text-update", expect.any(Function));
    // Cleanup of previous effect runs the prior unsubscribe
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

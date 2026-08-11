import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

if (globalThis.ResizeObserver === undefined) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "electron", {
    value: {
      invoke: vi.fn(() => Promise.resolve()),
      on: vi.fn(() => vi.fn()),
      removeListener: vi.fn(),
    },
    writable: true,
  });
}

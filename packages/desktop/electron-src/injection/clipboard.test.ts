// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  clipboard: {
    readText: vi.fn(),
    writeText: vi.fn(),
  },
  systemPreferences: {
    isTrustedAccessibilityClient: vi.fn(() => true),
  },
}));

vi.mock("uiohook-napi", () => ({
  UiohookKey: { V: 47, Ctrl: 29, Meta: 3675 },
  uIOhook: { keyTap: vi.fn() },
}));

vi.mock("../utils/platform", () => ({
  isLinux: vi.fn(() => false),
  isMac: vi.fn(() => false),
  isWindows: vi.fn(() => false),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { clipboard, systemPreferences } from "electron";
import { UiohookKey, uIOhook } from "uiohook-napi";
import { isMac, isLinux, isWindows } from "../utils/platform";
import { ClipboardService } from "./clipboard";

function setPlatform(platform: "mac" | "linux" | "windows"): void {
  vi.mocked(isMac).mockReturnValue(platform === "mac");
  vi.mocked(isLinux).mockReturnValue(platform === "linux");
  vi.mocked(isWindows).mockReturnValue(platform === "windows");
}

describe("ClipboardService", () => {
  let service: ClipboardService;
  let lastWritten: string;

  beforeEach(() => {
    vi.clearAllMocks();
    lastWritten = "";
    service = new ClipboardService();

    vi.mocked(systemPreferences.isTrustedAccessibilityClient).mockReturnValue(true);
    vi.mocked(clipboard.writeText).mockImplementation(async (t: string) => {
      lastWritten = t;
    });
    vi.mocked(clipboard.readText).mockImplementation(async () => lastWritten);
    setPlatform("linux");
  });

  describe("writeText delegation", () => {
    it("calls electron.clipboard.writeText with the input text", async () => {
      await service.inject("hello world");
      expect(clipboard.writeText).toHaveBeenCalledWith("hello world");
    });

    it("handles empty string", async () => {
      const res = await service.inject("");
      expect(clipboard.writeText).toHaveBeenCalledWith("");
      expect(res.success).toBe(true);
    });

    it(String.raw`handles multi-line text with \n`, async () => {
      const text = "line one\nline two\nline three";
      const res = await service.inject(text);
      expect(clipboard.writeText).toHaveBeenCalledWith(text);
      expect(res.success).toBe(true);
    });

    it("handles special characters", async () => {
      const text = String.raw`特殊字符 "quote" \backslash\ $ {json} <html>`;
      const res = await service.inject(text);
      expect(clipboard.writeText).toHaveBeenCalledWith(text);
      expect(res.success).toBe(true);
    });

    it("handles tabs and carriage returns", async () => {
      const text = "col1\tcol2\tcol3\r\nwindows";
      await service.inject(text);
      expect(clipboard.writeText).toHaveBeenCalledWith(text);
    });

    it("handles unicode emoji", async () => {
      const text = "🎉🚀✨";
      await service.inject(text);
      expect(clipboard.writeText).toHaveBeenCalledWith(text);
    });
  });

  describe("simulatePaste sends platform-correct keyboard sequence", () => {
    it("uses Meta+V on macOS", async () => {
      setPlatform("mac");
      await service.inject("x");
      expect(uIOhook.keyTap).toHaveBeenCalledWith(UiohookKey.V, [UiohookKey.Meta]);
    });

    it("uses Ctrl+V on Linux", async () => {
      setPlatform("linux");
      await service.inject("x");
      expect(uIOhook.keyTap).toHaveBeenCalledWith(UiohookKey.V, [UiohookKey.Ctrl]);
    });

    it("uses Ctrl+V on Windows", async () => {
      setPlatform("windows");
      await service.inject("x");
      expect(uIOhook.keyTap).toHaveBeenCalledWith(UiohookKey.V, [UiohookKey.Ctrl]);
    });
  });

  describe("success path", () => {
    it("returns success:true and zero retries when write + paste succeed first try", async () => {
      setPlatform("linux");
      const res = await service.inject("ok");
      expect(res.success).toBe(true);
      expect(res.retries).toBe(0);
    });

    it("restores original clipboard content after inject", async () => {
      const original = "before-inject";
      vi.mocked(clipboard.readText).mockImplementation(async () =>
        lastWritten === "" ? original : lastWritten,
      );
      await service.inject("injected");
      expect(clipboard.writeText).toHaveBeenLastCalledWith(original);
    });
  });

  describe("macOS accessibility gate", () => {
    it("throws AccessibilityPermissionError when not trusted on mac", async () => {
      setPlatform("mac");
      vi.mocked(systemPreferences.isTrustedAccessibilityClient).mockReturnValue(false);
      try {
        await service.inject("x");
        throw new Error("expected inject to reject");
      } catch (error) {
        expect((error as Error).message).toMatch(/Accessibility permission/);
      }
      expect(clipboard.writeText).not.toHaveBeenCalled();
    });

    it("skips a11y check on non-mac platforms", async () => {
      setPlatform("linux");
      await service.inject("x");
      expect(systemPreferences.isTrustedAccessibilityClient).not.toHaveBeenCalled();
    });
  });

  describe("clipboard write retry", () => {
    it("retries when readText does not match written text", async () => {
      vi.mocked(clipboard.readText).mockImplementation(async () => "stale");
      try {
        await service.inject("fresh");
        throw new Error("expected inject to reject");
      } catch (error) {
        expect((error as Error).message).toMatch(/Failed to write to clipboard/);
      }
      expect(vi.mocked(clipboard.writeText).mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});

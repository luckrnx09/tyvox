import { describe, expect, it } from "vitest";
import { AccessibilityPermissionError, ClipboardError, TyvoxError } from "./errors";

describe("Error classes", () => {
  it("ClipboardError carries code, message, and TyvoxError lineage", () => {
    const err = new ClipboardError("write failed");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TyvoxError);
    expect(err.name).toBe("ClipboardError");
    expect(err.code).toBe("CLIPBOARD_ERROR");
    expect(err.recoverable).toBe(true);
    expect(err.message).toBe("write failed");
  });

  it("AccessibilityPermissionError carries code and message", () => {
    const err = new AccessibilityPermissionError("grant it");
    expect(err).toBeInstanceOf(TyvoxError);
    expect(err.name).toBe("AccessibilityPermissionError");
    expect(err.code).toBe("ACCESSIBILITY_PERMISSION_NEEDED");
    expect(err.message).toBe("grant it");
  });
});

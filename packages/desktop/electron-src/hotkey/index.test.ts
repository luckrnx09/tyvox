// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("uiohook-napi", () => {
  let n = 1;
  const next = () => n++;
  return {
    UiohookKey: {
      Alt: next(),
      AltRight: next(),
      ArrowDown: next(),
      ArrowLeft: next(),
      ArrowRight: next(),
      ArrowUp: next(),
      Backspace: next(),
      CapsLock: next(),
      Ctrl: next(),
      CtrlRight: next(),
      Delete: next(),
      End: next(),
      Enter: next(),
      Escape: next(),
      F1: next(),
      F10: next(),
      F11: next(),
      F12: next(),
      F13: next(),
      F14: next(),
      F15: next(),
      F16: next(),
      F17: next(),
      F18: next(),
      F19: next(),
      F2: next(),
      F20: next(),
      F3: next(),
      F4: next(),
      F5: next(),
      F6: next(),
      F7: next(),
      F8: next(),
      F9: next(),
      Home: next(),
      Insert: next(),
      Meta: next(),
      MetaRight: next(),
      PageDown: next(),
      PageUp: next(),
      Shift: next(),
      ShiftRight: next(),
      Space: next(),
      Tab: next(),
    },
  };
});

import { UiohookKey } from "uiohook-napi";
import { parseHotkey, isModifierToken } from "./index";

describe("parseHotkey", () => {
  describe("single special / function keys (no modifiers)", () => {
    it("parses F5 alone", () => {
      const r = parseHotkey("F5");
      expect(r).not.toBeNull();
      expect(r!.mainKeycode).toBe(UiohookKey.F5);
      expect(r!.mainIsModifier).toBe(false);
      expect(r!.requireAlt).toBe(false);
      expect(r!.requireCtrl).toBe(false);
      expect(r!.requireMeta).toBe(false);
      expect(r!.requireShift).toBe(false);
      expect(r!.cmdOrCtrl).toBe(false);
    });

    it("parses Tab alone", () => {
      const r = parseHotkey("Tab");
      expect(r).not.toBeNull();
      expect(r!.mainKeycode).toBe(UiohookKey.Tab);
    });

    it("parses Space alone", () => {
      const r = parseHotkey("Space");
      expect(r!.mainKeycode).toBe(UiohookKey.Space);
    });

    it("parses Enter alone", () => {
      expect(parseHotkey("Enter")!.mainKeycode).toBe(UiohookKey.Enter);
    });
  });

  describe("modifier + key combos", () => {
    it("parses Alt+Tab → main Tab, requireAlt", () => {
      const r = parseHotkey("Alt+Tab");
      expect(r).not.toBeNull();
      expect(r!.mainKeycode).toBe(UiohookKey.Tab);
      expect(r!.requireAlt).toBe(true);
      expect(r!.requireCtrl).toBe(false);
      expect(r!.requireMeta).toBe(false);
      expect(r!.requireShift).toBe(false);
      expect(r!.cmdOrCtrl).toBe(false);
    });

    it("parses Shift+F2 → main F2, requireShift", () => {
      const r = parseHotkey("Shift+F2");
      expect(r!.mainKeycode).toBe(UiohookKey.F2);
      expect(r!.requireShift).toBe(true);
      expect(r!.requireAlt).toBe(false);
    });

    it("parses Ctrl+Shift+F5 → multiple modifiers stacked", () => {
      const r = parseHotkey("Ctrl+Shift+F5");
      expect(r).not.toBeNull();
      expect(r!.mainKeycode).toBe(UiohookKey.F5);
      expect(r!.requireCtrl).toBe(true);
      expect(r!.requireShift).toBe(true);
      expect(r!.requireAlt).toBe(false);
      expect(r!.requireMeta).toBe(false);
      expect(r!.cmdOrCtrl).toBe(false);
    });

    it("parses Cmd+Space → Cmd maps to meta flag", () => {
      const r = parseHotkey("Cmd+Space");
      expect(r!.requireMeta).toBe(true);
      expect(r!.requireCtrl).toBe(false);
    });

    it("parses Control+ArrowLeft → Control maps to ctrl flag", () => {
      const r = parseHotkey("Control+ArrowLeft");
      expect(r!.mainKeycode).toBe(UiohookKey.ArrowLeft);
      expect(r!.requireCtrl).toBe(true);
    });

    it("parses Meta+Enter → Meta maps to meta flag", () => {
      const r = parseHotkey("Meta+Enter");
      expect(r!.requireMeta).toBe(true);
    });
  });

  describe("CmdOrCtrl semantics", () => {
    it("parses CmdOrCtrl+Tab → cmdOrCtrl flag, no requireCtrl/Meta", () => {
      const r = parseHotkey("CmdOrCtrl+Tab");
      expect(r).not.toBeNull();
      expect(r!.cmdOrCtrl).toBe(true);
      expect(r!.requireCtrl).toBe(false);
      expect(r!.requireMeta).toBe(false);
    });

    it("CmdOrCtrl can stack with other modifiers", () => {
      const r = parseHotkey("CmdOrCtrl+Shift+F5");
      expect(r!.cmdOrCtrl).toBe(true);
      expect(r!.requireShift).toBe(true);
    });
  });

  describe("lone modifier binds (single-key)", () => {
    it("parses lone Meta as main key, mainIsModifier true", () => {
      const r = parseHotkey("Meta");
      expect(r).not.toBeNull();
      expect(r!.mainKeycode).toBe(UiohookKey.Meta);
      expect(r!.mainIsModifier).toBe(true);
      expect(r!.requireMeta).toBe(false);
    });

    it("parses lone AltRight as a modifier main key", () => {
      const r = parseHotkey("AltRight");
      expect(r!.mainKeycode).toBe(UiohookKey.AltRight);
      expect(r!.mainIsModifier).toBe(true);
    });

    it("parses lone ShiftRight", () => {
      const r = parseHotkey("ShiftRight");
      expect(r!.mainIsModifier).toBe(true);
      expect(r!.mainKeycode).toBe(UiohookKey.ShiftRight);
    });

    it("parses CtrlRight", () => {
      const r = parseHotkey("CtrlRight");
      expect(r!.mainKeycode).toBe(UiohookKey.CtrlRight);
    });

    it("lone modifier with extra modifier flag", () => {
      const r = parseHotkey("CmdOrCtrl+AltRight");
      expect(r!.mainIsModifier).toBe(true);
      expect(r!.cmdOrCtrl).toBe(true);
    });
  });

  describe("rejects unmapped / unsupported tokens", () => {
    it.each([
      ["letters not in map: Shift+A", "Shift+A"],
      ["digits not in map: CmdOrCtrl+1", "CmdOrCtrl+1"],
      ["letter combo: Ctrl+Shift+K", "Ctrl+Shift+K"],
      ["unknown modifier alias: Command", "Command"],
      ["unknown modifier alias: Option", "Option"],
      ["unknown modifier alias: Super", "Super"],
      ["non-token garbage: foo", "foo"],
      ["letter main with valid mods: Alt+A", "Alt+A"],
    ])("returns null for %s", (_label, accel) => {
      expect(parseHotkey(accel)).toBeNull();
    });
  });

  describe("empty / whitespace input", () => {
    it("returns null for empty string", () => {
      expect(parseHotkey("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(parseHotkey("   ")).toBeNull();
    });

    it("returns null for just a plus sign", () => {
      expect(parseHotkey("+")).toBeNull();
    });

    it("trims whitespace around tokens", () => {
      const r = parseHotkey("  Shift  +  F2  ");
      expect(r).not.toBeNull();
      expect(r!.requireShift).toBe(true);
    });
  });

  describe("rejects invalid modifier in leading position", () => {
    it("returns null when a leading token is not a known modifier", () => {
      expect(parseHotkey("F5+Tab")).toBeNull();
    });

    it("returns null when a leading token is a non-modifier special key", () => {
      expect(parseHotkey("Space+F5")).toBeNull();
    });
  });
});

describe("isModifierToken", () => {
  it.each([
    "Alt",
    "Control",
    "Ctrl",
    "Meta",
    "Cmd",
    "Shift",
    "AltRight",
    "ControlRight",
    "CtrlRight",
    "MetaRight",
    "CmdRight",
    "ShiftRight",
  ])("returns true for modifier token: %s", (tok) => {
    expect(isModifierToken(tok)).toBe(true);
  });

  it.each([
    ["empty string", ""],
    ["Space", "Space"],
    ["Enter", "Enter"],
    ["Tab", "Tab"],
    ["F5", "F5"],
    ["Command", "Command"],
    ["Option", "Option"],
    ["lowercase alt", "alt"],
    ["A", "A"],
    ["1", "1"],
  ])("returns false for non-modifier: %s", (_label, tok) => {
    expect(isModifierToken(tok)).toBe(false);
  });
});

import type { HotkeyMode } from "../../shared/types/state";
import { UiohookKey, uIOhook, type UiohookKeyboardEvent } from "uiohook-napi";
import { logger } from "../utils/logger";

type HotkeyCallback = () => void;

// uIOhook.start() spawns a native hook thread per call, and each thread
// re-delivers every event to JS. Starting it more than once duplicates all
// keydown/keyup events, so the whole process must share a single start.
let uiohookStarted = false;

export function ensureUiohookStarted(): void {
  if (uiohookStarted) {
    return;
  }
  uIOhook.start();
  uiohookStarted = true;
  logger.info("uIOhook started");
}

interface HotkeyHandlers {
  /** Fired when the hotkey is pressed (keydown). */
  onKeyDown: HotkeyCallback;
  /** Fired when the hotkey is released (keyup). Only used in PTT mode. */
  onKeyUp?: HotkeyCallback;
}

export class HotkeyService {
  #parsed: ReturnType<typeof parseHotkey> = null;
  #mode: HotkeyMode | null = null;
  #toggleActive = false;
  #handlers: HotkeyHandlers | null = null;
  #onKeyDownListener: ((event: UiohookKeyboardEvent) => void) | null = null;
  #onKeyUpListener: ((event: UiohookKeyboardEvent) => void) | null = null;
  /** PTT debounce: start fires after this delay; keyup within it cancels (silent click). */
  static readonly #PRESS_TO_TALK_START_DELAY_MS = 120;
  #pressToTalkStartTimer: ReturnType<typeof setTimeout> | null = null;
  /** Whether onKeyDown has actually fired for the current press (set by the timer). */
  #pressToTalkActive = false;
  /** Last seen keycode to suppress OS key-repeat events. */
  #lastDownKeycode: number | null = null;

  register(
    accelerator: string,
    mode: HotkeyMode,
    onKeyDown: HotkeyCallback,
    onKeyUp?: HotkeyCallback,
  ): boolean {
    this.unregister();
    const parsed = parseHotkey(accelerator);
    if (!parsed) {
      logger.warn("Hotkey: failed to parse accelerator", { accelerator });
      return false;
    }

    this.#mode = mode;
    this.#handlers = { onKeyDown, onKeyUp };
    this.#parsed = parsed;
    this.#toggleActive = false;

    this.#onKeyDownListener = (event) => this.#handleKeyDown(event);
    this.#onKeyUpListener = (event) => this.#handleKeyUp(event);
    uIOhook.on("keydown", this.#onKeyDownListener);
    uIOhook.on("keyup", this.#onKeyUpListener);

    ensureUiohookStarted();
    logger.info("Hotkey registered", { accelerator, mainKeycode: parsed.mainKeycode, mode });
    return true;
  }

  unregister(): void {
    if (this.#onKeyDownListener) {
      uIOhook.off("keydown", this.#onKeyDownListener);
      this.#onKeyDownListener = null;
    }
    if (this.#onKeyUpListener) {
      uIOhook.off("keyup", this.#onKeyUpListener);
      this.#onKeyUpListener = null;
    }
    if (this.#pressToTalkStartTimer) {
      clearTimeout(this.#pressToTalkStartTimer);
      this.#pressToTalkStartTimer = null;
    }
    this.#pressToTalkActive = false;
    this.#lastDownKeycode = null;
    this.#mode = null;
    this.#handlers = null;
    this.#parsed = null;
    this.#toggleActive = false;
  }

  /**
   * Does this key event match our parsed hotkey? For a lone-modifier hotkey
   * (main is a modifier), the matching is purely on keycode + that the OTHER
   * modifier flags are inactive (so e.g. AltRight doesn't also need altKey
   * true — uIOhook reports altKey for the held side, but to keep semantics
   * clean we treat a lone modifier press as "no other modifiers active").
   */
  #matches(event: UiohookKeyboardEvent): boolean {
    const parsed = this.#parsed;
    if (!parsed) {
      return false;
    }
    if (event.keycode !== parsed.mainKeycode) {
      return false;
    }

    if (parsed.mainIsModifier) {
      if (parsed.requireAlt || parsed.requireCtrl || parsed.requireMeta || parsed.requireShift) {
        return false;
      }
      return true;
    }

    if (parsed.cmdOrCtrl) {
      if (!event.ctrlKey && !event.metaKey) {
        return false;
      }
    } else {
      if (parsed.requireAlt && !event.altKey) {
        return false;
      }
      if (parsed.requireCtrl && !event.ctrlKey) {
        return false;
      }
      if (parsed.requireMeta && !event.metaKey) {
        return false;
      }
      if (parsed.requireShift && !event.shiftKey) {
        return false;
      }
    }
    if (!parsed.requireAlt && event.altKey) {
      return false;
    }
    if (!parsed.requireCtrl && !parsed.cmdOrCtrl && event.ctrlKey) {
      return false;
    }
    if (!parsed.requireMeta && !parsed.cmdOrCtrl && event.metaKey) {
      return false;
    }
    if (!parsed.requireShift && event.shiftKey) {
      return false;
    }
    return true;
  }

  #handleKeyDown(event: UiohookKeyboardEvent): void {
    if (!this.#matches(event) || !this.#handlers) {
      return;
    }
    if (this.#lastDownKeycode === event.keycode) {
      return;
    }
    this.#lastDownKeycode = event.keycode;

    if (this.#mode === "ptt") {
      // Debounce start so a quick click doesn't begin+immediately discard a
      // too-short recording. keyup within the start delay cancels.
      if (this.#pressToTalkStartTimer || this.#pressToTalkActive) {
        return;
      }
      const handlers = this.#handlers;
      this.#pressToTalkStartTimer = setTimeout(() => {
        this.#pressToTalkStartTimer = null;
        this.#pressToTalkActive = true;
        handlers.onKeyDown();
      }, HotkeyService.#PRESS_TO_TALK_START_DELAY_MS);
    } else if (this.#mode === "toggle") {
      this.#toggleActive = !this.#toggleActive;
      logger.info("Toggle hotkey pressed", { active: this.#toggleActive });
      this.#handlers.onKeyDown();
    }
  }

  #handleKeyUp(event: UiohookKeyboardEvent): void {
    if (!this.#matches(event) || !this.#handlers) {
      return;
    }
    this.#lastDownKeycode = null;
    if (this.#mode !== "ptt") {
      return;
    }
    if (this.#pressToTalkStartTimer) {
      // Click shorter than the start delay → silent ignore, no start sound.
      clearTimeout(this.#pressToTalkStartTimer);
      this.#pressToTalkStartTimer = null;
      return;
    }
    if (this.#pressToTalkActive) {
      this.#pressToTalkActive = false;
      this.#handlers.onKeyUp?.();
    }
  }
}

/**
 * Maps an accelerator token (the part after the last '+', or a lone modifier
 * token) to a uiohook keycode. Supports left/right modifier variants.
 *
 * Electron accelerator tokens are normalized (Alt, Control, Meta, Shift), but
 * we also accept the right-side variants (AltRight, MetaRight, CtrlRight,
 * ShiftRight) so users can bind a single physical modifier key.
 */
const TOKEN_TO_KEYCODE: Record<string, number> = {
  // Modifiers — left (generic)
  Alt: UiohookKey.Alt,
  Control: UiohookKey.Ctrl,
  Ctrl: UiohookKey.Ctrl,
  Meta: UiohookKey.Meta,
  Cmd: UiohookKey.Meta,
  Shift: UiohookKey.Shift,
  // Modifiers — right (for single-key binds)
  AltRight: UiohookKey.AltRight,
  ControlRight: UiohookKey.CtrlRight,
  CtrlRight: UiohookKey.CtrlRight,
  MetaRight: UiohookKey.MetaRight,
  CmdRight: UiohookKey.MetaRight,
  ShiftRight: UiohookKey.ShiftRight,
  // Special keys
  Space: UiohookKey.Space,
  Enter: UiohookKey.Enter,
  Tab: UiohookKey.Tab,
  Escape: UiohookKey.Escape,
  Backspace: UiohookKey.Backspace,
  CapsLock: UiohookKey.CapsLock,
  ArrowLeft: UiohookKey.ArrowLeft,
  ArrowRight: UiohookKey.ArrowRight,
  ArrowUp: UiohookKey.ArrowUp,
  ArrowDown: UiohookKey.ArrowDown,
  Home: UiohookKey.Home,
  End: UiohookKey.End,
  PageUp: UiohookKey.PageUp,
  PageDown: UiohookKey.PageDown,
  Insert: UiohookKey.Insert,
  Delete: UiohookKey.Delete,
  // Function keys
  F1: UiohookKey.F1,
  F2: UiohookKey.F2,
  F3: UiohookKey.F3,
  F4: UiohookKey.F4,
  F5: UiohookKey.F5,
  F6: UiohookKey.F6,
  F7: UiohookKey.F7,
  F8: UiohookKey.F8,
  F9: UiohookKey.F9,
  F10: UiohookKey.F10,
  F11: UiohookKey.F11,
  F12: UiohookKey.F12,
  F13: UiohookKey.F13,
  F14: UiohookKey.F14,
  F15: UiohookKey.F15,
  F16: UiohookKey.F16,
  F17: UiohookKey.F17,
  F18: UiohookKey.F18,
  F19: UiohookKey.F19,
  F20: UiohookKey.F20,
};

/** Is this token a modifier (left or right)? */
export const isModifierToken = (token: string): boolean =>
  /^(Alt|Control|Ctrl|Meta|Cmd|Shift)(Right)?$/.test(token);

/**
 * Parses an accelerator string into:
 *  - `mainKeycode`: keycode of the primary key (the last token; for a lone
 *    modifier this is the modifier itself)
 *  - `mainToken`: the display token of the primary key
 *  - `modifierFlags`: which modifier flags must ALL be active for the hotkey
 *    to fire (excluding the main key if the main key is itself a modifier)
 *
 * Tokens are joined with '+'. Examples:
 *   "CmdOrCtrl+A"   → main A, mods {ctrlKey OR metaKey}
 *   "AltRight"      → main AltRight (lone modifier), no extra mod flags
 *   "Alt+Space"     → main Space, mod {altKey}
 *   "Shift+F2"      → main F2, mod {shiftKey}
 *
 * CmdOrCtrl is treated specially: it matches when EITHER ctrlKey OR metaKey is
 * active (Electron semantics).
 */
interface ParsedHotkey {
  mainKeycode: number;
  mainIsModifier: boolean;
  /** Modifier flags required from the event (excluding the main key). */
  requireAlt: boolean;
  requireCtrl: boolean;
  requireMeta: boolean;
  requireShift: boolean;
  /** CmdOrCtrl semantics: match ctrl OR meta. */
  cmdOrCtrl: boolean;
}

const MOD_TOKEN_TO_FLAG: Record<string, "alt" | "ctrl" | "meta" | "shift"> = {
  Alt: "alt",
  Cmd: "meta",
  Control: "ctrl",
  Ctrl: "ctrl",
  Meta: "meta",
  Shift: "shift",
};

export const parseHotkey = (accelerator: string): ParsedHotkey | null => {
  const tokens = accelerator
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }
  const mainToken = tokens.at(-1)!;
  const mainKeycode = TOKEN_TO_KEYCODE[mainToken];
  if (mainKeycode === undefined) {
    return null;
  }

  const flags = { alt: false, ctrl: false, meta: false, shift: false };
  let cmdOrCtrl = false;
  for (const token of tokens.slice(0, -1)) {
    if (token === "CmdOrCtrl") {
      cmdOrCtrl = true;
      continue;
    }
    const flag = MOD_TOKEN_TO_FLAG[token];
    if (!flag) {
      return null;
    }
    flags[flag] = true;
  }

  const mainIsModifier = isModifierToken(mainToken);

  return {
    cmdOrCtrl,
    mainIsModifier,
    mainKeycode,
    requireAlt: flags.alt,
    requireCtrl: flags.ctrl,
    requireMeta: flags.meta,
    requireShift: flags.shift,
  };
};

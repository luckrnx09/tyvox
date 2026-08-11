export const CAPSULE_STATES = [
  "idle",
  "recording",
  "transcribing",
  "polishing",
  "translating",
  "injecting",
  "fallback",
  "error",
] as const;
export type CapsuleState = (typeof CAPSULE_STATES)[number];

export const HOTKEY_MODES = ["ptt", "toggle"] as const;
export type HotkeyMode = (typeof HOTKEY_MODES)[number];

import type { ActionType } from "@tyvox/sdk/contracts";

export interface CapsuleError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface HotkeyStartPayload {
  readonly action: ActionType | null;
  readonly sessionId: string;
}

export interface PlatformResult {
  readonly platform: "darwin" | "linux" | "win32";
  readonly arch: string;
  readonly version: string;
}

export type UpdateStatus =
  | { readonly state: "checking" }
  | { readonly state: "available"; readonly version: string }
  | { readonly state: "downloaded"; readonly version: string }
  | { readonly state: "not-available" }
  | { readonly state: "error"; readonly message: string };

export interface AudioDevice {
  readonly id: string;
  readonly name: string;
  readonly isDefault: boolean;
}

export interface ElectronAPI {
  readonly invoke: <T>(channel: string, ...arguments_: unknown[]) => Promise<T>;
  readonly on: (channel: string, callback: (...arguments_: unknown[]) => void) => () => void;
  readonly send: (channel: string, ...arguments_: unknown[]) => void;
}

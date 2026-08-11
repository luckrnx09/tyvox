export abstract class TyvoxError extends Error {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;

  constructor(message: string) {
    super(message);
  }
}

export class ClipboardError extends TyvoxError {
  override name = "ClipboardError" as const;
  readonly code = "CLIPBOARD_ERROR" as const;
  readonly recoverable = true;
  constructor(message: string) {
    super(message);
  }
}

export class AccessibilityPermissionError extends TyvoxError {
  override name = "AccessibilityPermissionError" as const;
  readonly code = "ACCESSIBILITY_PERMISSION_NEEDED" as const;
  readonly recoverable = true;
  constructor(message: string) {
    super(message);
  }
}

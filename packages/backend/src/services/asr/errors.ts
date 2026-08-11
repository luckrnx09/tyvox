import { TyvoxError } from "../errors.js";

export { TyvoxError, ProviderInitError } from "../errors.js";

export class ProviderNotAvailableError extends TyvoxError {
  override name = "ProviderNotAvailableError" as const;
  readonly code = "PROVIDER_NOT_AVAILABLE" as const;
  readonly recoverable = true;
  constructor(
    message: string,
    public readonly providerName: string,
  ) {
    super(message);
  }
}

export class TranscriptionError extends TyvoxError {
  override name = "TranscriptionError" as const;
  readonly code = "TRANSCRIPTION_ERROR" as const;
  readonly recoverable = true;
  constructor(
    message: string,
    public readonly providerName: string,
  ) {
    super(message);
  }
}

export class NoSpeechError extends TyvoxError {
  override name = "NoSpeechError" as const;
  readonly code = "NO_SPEECH_DETECTED" as const;
  readonly recoverable = true;
  constructor() {
    super("No speech detected in audio");
  }
}

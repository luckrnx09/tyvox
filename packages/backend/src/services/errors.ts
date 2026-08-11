export abstract class TyvoxError extends Error {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;

  constructor(message: string) {
    super(message);
  }
}

export class ProviderInitError extends TyvoxError {
  override name = "ProviderInitError" as const;
  readonly code = "PROVIDER_INIT_ERROR" as const;
  readonly recoverable = true;
  constructor(
    message: string,
    public readonly providerName: string,
  ) {
    super(message);
  }
}

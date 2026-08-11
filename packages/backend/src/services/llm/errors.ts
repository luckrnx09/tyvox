import { TyvoxError } from "../errors.js";

export class TransformError extends TyvoxError {
  override name = "TransformError" as const;
  readonly code = "TRANSFORM_ERROR" as const;
  readonly recoverable = true;
  constructor(
    message: string,
    public readonly providerName: string,
  ) {
    super(message);
  }
}

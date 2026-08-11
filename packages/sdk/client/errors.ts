export class ApiError extends Error {
  override name = "ApiError" as const;

  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

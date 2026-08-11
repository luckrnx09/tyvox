import type { Context } from "hono";

export class AppError extends Error {
  override name = "AppError" as const;

  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
  }
}

interface ServiceError {
  readonly code: string;
  readonly message: string;
  readonly recoverable?: boolean;
}

function isServiceError(error: unknown): error is ServiceError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "string"
  );
}

function serviceCodeToStatus(code: string): 400 | 404 | 412 | 422 | 500 | 502 | 503 {
  switch (code) {
    case "NO_SPEECH_DETECTED":
      return 422;
    case "TRANSCRIPTION_ERROR":
      return 502;
    case "PROVIDER_NOT_AVAILABLE":
      return 503;
    case "MODEL_NOT_DOWNLOADED":
      return 412;
    case "SESSION_NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}

export function onError(error: Error, context: Context) {
  if (error instanceof AppError) {
    return context.json(
      { error: { code: error.code, message: error.message } },
      error.status as 400 | 404 | 500,
    );
  }
  if (isServiceError(error)) {
    return context.json(
      { error: { code: error.code, message: error.message } },
      serviceCodeToStatus(error.code),
    );
  }
  console.error("Unhandled error:", error);
  return context.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
}

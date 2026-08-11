import type { MiddlewareHandler } from "hono";
import { AppError, type AppEnv } from "@tyvox/sdk/server";

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const userMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
  const userId = context.req.header("X-User-ID");
  if (!userId) {
    throw new AppError("MISSING_USER_ID", "X-User-ID header is required", 401);
  }
  if (!USER_ID_PATTERN.test(userId)) {
    throw new AppError("INVALID_USER_ID", "X-User-ID header has an invalid format", 400);
  }
  context.set("user", { id: userId });
  await next();
};

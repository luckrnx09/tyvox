import type { Context, Next } from "hono";
import { getLogger } from "../utils/logger.js";

const DEFAULT_SOURCE = "unknown";

export async function loggerMiddleware(c: Context, next: Next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const status = c.res.status;
  const source = c.req.header("x-source") ?? DEFAULT_SOURCE;
  const sessionId = c.req.header("x-session-id");

  const logger = getLogger(source);
  const message = `${c.req.method} ${c.req.path} ${status} ${ms}ms`;
  const meta = { kind: "request" as const, sessionId };

  if (status >= 400) {
    const body = await c.res.clone().text();
    logger.error({ ...meta, body }, message);
  } else {
    logger.info(meta, message);
  }
}

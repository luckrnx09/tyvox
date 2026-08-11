import { resolveSessionId } from "@tyvox/sdk/client";
import { createRemoteLogger } from "../../shared/logger";
import { IPC } from "../../shared/channels";

export const logger = createRemoteLogger({
  send: (entries) => window.electron.send(IPC.LOGS, entries),
  getSessionId: resolveSessionId,
});

window.addEventListener("error", (event) => {
  logger.error(event.message, {
    filename: event.filename,
    lineno: event.lineno,
    stack: event.error?.stack,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  logger.error("Unhandled rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

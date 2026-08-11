import { getLogger } from "../../utils/logger.js";
import type { ClientLogEntry } from "@tyvox/sdk/contracts";

export const clientLogService = {
  async write(source: string, entries: ClientLogEntry[]): Promise<void> {
    const logger = getLogger(source);
    for (const entry of entries) {
      const log = logger[entry.level];
      if (typeof log !== "function") continue;
      log.call(
        logger,
        {
          kind: "report" as const,
          sessionId: entry.sessionId,
          stack: entry.stack,
          context: entry.extra,
        },
        entry.message,
      );
    }
  },
};

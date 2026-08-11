import { postClientLogs, resolveSessionId } from "@tyvox/sdk/client";
import { createRemoteLogger } from "../../shared/logger";

export const logger = createRemoteLogger({
  send: (entries) => postClientLogs({ entries }),
  getSessionId: resolveSessionId,
});
